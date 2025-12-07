import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/doctors/[id]/slots-by-date
 * 특정 의사의 날짜별 예약 가능 슬롯 수 조회 (4주간) - 초고속 버전
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params

    // 오늘부터 4주간의 날짜 범위
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 28)
    
    const startDateStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 모든 데이터를 한 번에 병렬 조회
    const [doctor, templates, exceptions, bookedCounts] = await Promise.all([
      // 의사 확인
      prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, name: true, isActive: true },
      }),
      // 스케줄 템플릿
      prisma.scheduleTemplate.findMany({
        where: { doctorId, isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true, slotIntervalMinutes: true },
      }),
      // 휴진일
      prisma.scheduleException.findMany({
        where: { doctorId, date: { gte: startDateStr, lte: endDateStr }, type: 'OFF' },
        select: { date: true },
      }),
      // 날짜별 예약 수 (groupBy로 한 번에)
      prisma.appointment.groupBy({
        by: ['date'],
        where: {
          doctorId,
          date: { gte: startDateStr, lte: endDateStr },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        _count: { id: true },
      }),
    ])

    if (!doctor || !doctor.isActive) {
      return NextResponse.json({ success: false, error: '의사를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 요일별 슬롯 수 계산 (템플릿 기반)
    const slotsPerDay: Record<number, number> = {}
    for (const t of templates) {
      const [sh, sm] = t.startTime.split(':').map(Number)
      const [eh, em] = t.endTime.split(':').map(Number)
      const slots = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / t.slotIntervalMinutes)
      slotsPerDay[t.dayOfWeek] = (slotsPerDay[t.dayOfWeek] || 0) + slots
    }

    // 휴진일 Set
    const offDates = new Set(exceptions.map(e => e.date))

    // 날짜별 예약 수 Map
    const bookedMap = new Map(bookedCounts.map(b => [b.date, b._count.id]))

    // 현재 시간
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentHour = now.getHours()

    // 날짜별 슬롯 계산
    const slotsByDate: Record<string, number> = {}

    for (let i = 0; i < 28; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      // 휴진일 또는 스케줄 없는 날 스킵
      if (offDates.has(dateStr)) continue
      const totalSlots = slotsPerDay[dayOfWeek]
      if (!totalSlots) continue

      // 예약된 수 제외
      const booked = bookedMap.get(dateStr) || 0
      let available = totalSlots - booked

      // 오늘이면 지난 시간 고려 (대략적으로)
      if (dateStr === todayStr && currentHour >= 9) {
        const passedSlots = Math.floor((currentHour - 9 + 2) / 0.25) // 2시간 여유 + 15분 슬롯
        available = Math.max(0, available - passedSlots)
      }

      if (available > 0) {
        slotsByDate[dateStr] = available
      }
    }

    return NextResponse.json({
      success: true,
      doctorId,
      doctorName: doctor.name,
      slotsByDate,
    })
  } catch (error) {
    console.error('날짜별 슬롯 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '슬롯 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
