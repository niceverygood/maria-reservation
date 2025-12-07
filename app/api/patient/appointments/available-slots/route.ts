import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/patient/appointments/available-slots
 * 환자용 - 특정 의사, 특정 날짜의 예약 가능 슬롯 조회 (최적화 버전)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { doctorId, date } = body

    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: 'doctorId와 date는 필수입니다.' },
        { status: 400 }
      )
    }

    // 날짜 검증
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestDate = new Date(date)
    
    if (requestDate < today) {
      return NextResponse.json({ success: false, error: '과거 날짜는 예약할 수 없습니다.' }, { status: 400 })
    }

    const dayOfWeek = requestDate.getDay()

    // 한 번에 모든 데이터 조회
    const [doctor, templates, exception, bookedAppointments] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, name: true, department: true, isActive: true },
      }),
      prisma.scheduleTemplate.findMany({
        where: { doctorId, dayOfWeek, isActive: true },
        select: { startTime: true, endTime: true, slotIntervalMinutes: true },
        orderBy: { startTime: 'asc' },
      }),
      prisma.scheduleException.findFirst({
        where: { doctorId, date },
      }),
      prisma.appointment.findMany({
        where: { doctorId, date, status: { in: ['PENDING', 'BOOKED'] } },
        select: { time: true },
      }),
    ])

    if (!doctor || !doctor.isActive) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 진료하지 않는 의사입니다.' }, { status: 404 })
    }

    // 휴진일 체크
    if (exception?.type === 'OFF') {
      return NextResponse.json({
        success: true,
        doctor: { id: doctor.id, name: doctor.name, department: doctor.department },
        date,
        slots: [],
        availableCount: 0,
        totalCount: 0,
      })
    }

    // 슬롯 생성
    const generateSlots = (start: string, end: string, interval: number): string[] => {
      const slots: string[] = []
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let curr = sh * 60 + sm
      const endMin = eh * 60 + em
      while (curr < endMin) {
        slots.push(`${String(Math.floor(curr / 60)).padStart(2, '0')}:${String(curr % 60).padStart(2, '0')}`)
        curr += interval
      }
      return slots
    }

    let allSlots: string[] = []

    if (exception?.type === 'CUSTOM' && exception.customStart && exception.customEnd) {
      allSlots = generateSlots(exception.customStart, exception.customEnd, exception.customInterval || 15)
    } else if (templates.length > 0) {
      for (const t of templates) {
        allSlots.push(...generateSlots(t.startTime, t.endTime, t.slotIntervalMinutes))
      }
    }

    // 중복 제거 및 정렬
    allSlots = [...new Set(allSlots)].sort()

    // 예약된 시간 Set
    const bookedTimes = new Set(bookedAppointments.map(a => a.time))

    // 현재 시간 체크 (오늘이면 2시간 이내 슬롯 제외)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const isToday = date === todayStr
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const MIN_ADVANCE = 120

    // 슬롯 상태 계산
    const slots = allSlots.map(time => {
      const [h, m] = time.split(':').map(Number)
      const slotMinutes = h * 60 + m
      
      let available = true
      
      // 이미 예약된 시간
      if (bookedTimes.has(time)) available = false
      
      // 오늘이고 시간이 촉박함
      if (isToday && slotMinutes - currentMinutes < MIN_ADVANCE) available = false

      return { time, available }
    })

    return NextResponse.json({
      success: true,
      doctor: { id: doctor.id, name: doctor.name, department: doctor.department },
      date,
      slots,
      availableCount: slots.filter(s => s.available).length,
      totalCount: slots.length,
    })
  } catch (error) {
    console.error('예약 가능 슬롯 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 가능 시간을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
