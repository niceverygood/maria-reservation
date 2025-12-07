import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/doctors/[id]/slots-by-date
 * 특정 의사의 날짜별 예약 가능 슬롯 수 조회 (4주간) - 최적화 버전
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params

    // 의사 존재 여부 확인
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    })

    if (!doctor || !doctor.isActive) {
      return NextResponse.json(
        { success: false, error: '의사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 오늘부터 4주간의 날짜 범위
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 28)
    
    const startDateStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 한 번에 모든 데이터 조회
    const [scheduleTemplates, scheduleExceptions, existingAppointments] = await Promise.all([
      // 해당 의사의 모든 스케줄 템플릿
      prisma.scheduleTemplate.findMany({
        where: { doctorId, isActive: true },
        orderBy: { startTime: 'asc' },
      }),
      // 해당 기간의 예외일
      prisma.scheduleException.findMany({
        where: {
          doctorId,
          date: { gte: startDateStr, lte: endDateStr },
        },
      }),
      // 해당 기간의 기존 예약 (PENDING과 BOOKED 모두)
      prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: startDateStr, lte: endDateStr },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        select: { date: true, time: true },
      }),
    ])

    // 요일별 스케줄 템플릿 매핑
    const templatesByDay: Map<number, typeof scheduleTemplates> = new Map()
    for (const template of scheduleTemplates) {
      const existing = templatesByDay.get(template.dayOfWeek) || []
      existing.push(template)
      templatesByDay.set(template.dayOfWeek, existing)
    }

    // 예외일 매핑
    const exceptionsByDate: Map<string, typeof scheduleExceptions[0]> = new Map()
    for (const exception of scheduleExceptions) {
      exceptionsByDate.set(exception.date, exception)
    }

    // 날짜별 예약 수 매핑
    const bookedByDateAndTime: Map<string, Set<string>> = new Map()
    for (const apt of existingAppointments) {
      const key = apt.date
      if (!bookedByDateAndTime.has(key)) {
        bookedByDateAndTime.set(key, new Set())
      }
      bookedByDateAndTime.get(key)!.add(apt.time)
    }

    // 시간을 분으로 변환
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    // 분을 시간으로 변환
    const minutesToTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    }

    // 슬롯 생성
    const generateSlots = (startTime: string, endTime: string, interval: number) => {
      const slots: string[] = []
      const start = timeToMinutes(startTime)
      const end = timeToMinutes(endTime)
      for (let t = start; t < end; t += interval) {
        slots.push(minutesToTime(t))
      }
      return slots
    }

    // 현재 시간 (최소 예약 시간 체크용)
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const todayStr = now.toISOString().split('T')[0]
    const MIN_ADVANCE_MINUTES = 120 // 2시간 전

    // 날짜별 슬롯 계산
    const slotsByDate: Record<string, number> = {}

    for (let i = 0; i < 28; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      // 예외일 확인
      const exception = exceptionsByDate.get(dateStr)
      
      // 휴진일이면 스킵
      if (exception?.type === 'OFF') {
        continue
      }

      let allSlots: string[] = []

      if (exception?.type === 'CUSTOM' && exception.customStart && exception.customEnd && exception.customInterval) {
        // 커스텀 스케줄
        allSlots = generateSlots(exception.customStart, exception.customEnd, exception.customInterval)
      } else {
        // 기본 스케줄 템플릿
        const templates = templatesByDay.get(dayOfWeek)
        if (!templates || templates.length === 0) {
          continue
        }
        
        for (const template of templates) {
          const templateSlots = generateSlots(template.startTime, template.endTime, template.slotIntervalMinutes)
          allSlots = allSlots.concat(templateSlots)
        }
      }

      // 중복 제거 및 정렬
      allSlots = [...new Set(allSlots)].sort()

      // 이미 예약된 시간 제외
      const bookedTimes = bookedByDateAndTime.get(dateStr) || new Set()
      
      // 예약 가능한 슬롯 수 계산
      let availableCount = 0
      for (const slot of allSlots) {
        // 이미 예약된 시간이면 스킵
        if (bookedTimes.has(slot)) continue

        // 오늘이고 촉박한 시간이면 스킵
        if (dateStr === todayStr) {
          const slotMinutes = timeToMinutes(slot)
          if (slotMinutes - currentMinutes < MIN_ADVANCE_MINUTES) continue
        }

        availableCount++
      }

      if (availableCount > 0) {
        slotsByDate[dateStr] = availableCount
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
