import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { formatLocalDate } from '@/lib/dateUtils'

/**
 * GET /api/patient/slots/count-by-date
 * 날짜별 예약 가능한 총 슬롯 수 조회 (최적화 버전)
 * 
 * Query: startDate, endDate (YYYY-MM-DD)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate와 endDate가 필요합니다.' }, { status: 400 })
    }

    // 모든 필요한 데이터를 병렬로 조회
    const [doctors, scheduleTemplates, exceptions, appointments] = await Promise.all([
      // 활성 의사
      prisma.doctor.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      // 스케줄 템플릿
      prisma.scheduleTemplate.findMany({
        where: { isActive: true },
        select: { doctorId: true, dayOfWeek: true, startTime: true, endTime: true, slotIntervalMinutes: true },
      }),
      // 해당 기간의 예외 (휴진/커스텀)
      prisma.scheduleException.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { doctorId: true, date: true, type: true, customStart: true, customEnd: true, customInterval: true },
      }),
      // 해당 기간의 기존 예약 (PENDING과 BOOKED)
      prisma.appointment.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        select: { doctorId: true, date: true, time: true },
      }),
    ])

    const doctorIds = new Set(doctors.map(d => d.id))

    // 날짜별 예약 맵 생성
    const bookedMap: Record<string, Record<string, Set<string>>> = {}
    for (const apt of appointments) {
      if (!bookedMap[apt.date]) bookedMap[apt.date] = {}
      if (!bookedMap[apt.date][apt.doctorId]) bookedMap[apt.date][apt.doctorId] = new Set()
      bookedMap[apt.date][apt.doctorId].add(apt.time)
    }

    // 날짜별 휴진/커스텀 맵
    const offMap: Record<string, Set<string>> = {}
    const customMap: Record<string, Record<string, { start: string; end: string; interval: number }>> = {}
    for (const exc of exceptions) {
      if (!doctorIds.has(exc.doctorId)) continue
      if (exc.type === 'OFF') {
        if (!offMap[exc.date]) offMap[exc.date] = new Set()
        offMap[exc.date].add(exc.doctorId)
      } else if (exc.type === 'CUSTOM' && exc.customStart && exc.customEnd) {
        if (!customMap[exc.date]) customMap[exc.date] = {}
        customMap[exc.date][exc.doctorId] = {
          start: exc.customStart,
          end: exc.customEnd,
          interval: exc.customInterval || 15
        }
      }
    }

    // 의사별, 요일별 템플릿 맵 (빠른 조회용)
    const templateMap: Record<string, Record<number, typeof scheduleTemplates>> = {}
    for (const t of scheduleTemplates) {
      if (!doctorIds.has(t.doctorId)) continue
      if (!templateMap[t.doctorId]) templateMap[t.doctorId] = {}
      if (!templateMap[t.doctorId][t.dayOfWeek]) templateMap[t.doctorId][t.dayOfWeek] = []
      templateMap[t.doctorId][t.dayOfWeek].push(t)
    }

    // 시간 슬롯 생성 함수
    const generateSlots = (startTime: string, endTime: string, interval: number): string[] => {
      const slots: string[] = []
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      let currentMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60)
        const min = currentMinutes % 60
        slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
        currentMinutes += interval
      }

      return slots
    }

    // 오늘 날짜 및 현재 시간 (2시간 이내 슬롯 제외용)
    const now = new Date()
    const todayStr = formatLocalDate(now)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const MIN_ADVANCE = 120 // 2시간

    // 날짜별 슬롯 수 계산
    const counts: Record<string, number> = {}
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalDate(d)
      const dayOfWeek = d.getDay()
      const isToday = dateStr === todayStr
      
      let totalAvailable = 0

      for (const doctorId of doctorIds) {
        // 휴진인 경우 스킵
        if (offMap[dateStr]?.has(doctorId)) continue

        let slots: string[] = []

        // 특별 스케줄이 있는 경우
        if (customMap[dateStr]?.[doctorId]) {
          const custom = customMap[dateStr][doctorId]
          slots = generateSlots(custom.start, custom.end, custom.interval)
        } else {
          // 기본 템플릿 사용
          const templates = templateMap[doctorId]?.[dayOfWeek] || []
          for (const template of templates) {
            slots.push(...generateSlots(template.startTime, template.endTime, template.slotIntervalMinutes))
          }
        }

        // 중복 제거
        slots = [...new Set(slots)]

        // 이미 예약된 시간 제외
        const bookedTimes = bookedMap[dateStr]?.[doctorId] || new Set()
        let availableSlots = slots.filter(slot => !bookedTimes.has(slot))
        
        // 오늘이면 2시간 이내 슬롯 제외
        if (isToday) {
          availableSlots = availableSlots.filter(slot => {
            const [h, m] = slot.split(':').map(Number)
            return h * 60 + m - currentMinutes >= MIN_ADVANCE
          })
        }
        
        totalAvailable += availableSlots.length
      }
      
      counts[dateStr] = totalAvailable
    }

    return NextResponse.json({ success: true, counts })
  } catch (error) {
    console.error('날짜별 슬롯 수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
