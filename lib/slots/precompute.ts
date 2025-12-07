/**
 * 슬롯 사전 계산 시스템
 * 
 * 매일 자정 또는 예약 변경 시 호출하여
 * 향후 4주치 슬롯 요약을 미리 계산합니다.
 */

import prisma from '@/lib/db'

interface SlotSummary {
  doctorId: string
  date: string
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  isOff: boolean
}

/**
 * 시간 슬롯 생성 유틸
 */
function generateTimeSlots(start: string, end: string, interval: number): string[] {
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

/**
 * 특정 의사의 특정 날짜 슬롯 요약 계산
 */
async function calculateDaySlots(
  doctorId: string,
  date: string,
  templates: { doctorId: string; dayOfWeek: number; startTime: string; endTime: string; slotIntervalMinutes: number }[],
  exceptions: Map<string, { type: string; customStart?: string | null; customEnd?: string | null; customInterval?: number | null }>,
  bookedCounts: Map<string, number>
): Promise<SlotSummary> {
  const targetDate = new Date(date + 'T00:00:00')
  const dayOfWeek = targetDate.getDay()
  const exceptionKey = `${doctorId}:${date}`
  const exception = exceptions.get(exceptionKey)

  // 휴진일 체크
  if (exception?.type === 'OFF') {
    return { doctorId, date, totalSlots: 0, availableSlots: 0, bookedSlots: 0, isOff: true }
  }

  // 슬롯 생성
  let allSlots: string[] = []

  if (exception?.type === 'CUSTOM' && exception.customStart && exception.customEnd) {
    allSlots = generateTimeSlots(exception.customStart, exception.customEnd, exception.customInterval || 15)
  } else {
    const doctorTemplates = templates.filter(t => t.doctorId === doctorId && t.dayOfWeek === dayOfWeek)
    for (const t of doctorTemplates) {
      allSlots.push(...generateTimeSlots(t.startTime, t.endTime, t.slotIntervalMinutes))
    }
  }

  // 중복 제거
  allSlots = [...new Set(allSlots)]

  const totalSlots = allSlots.length
  const bookedSlots = bookedCounts.get(`${doctorId}:${date}`) || 0
  const availableSlots = Math.max(0, totalSlots - bookedSlots)

  return { doctorId, date, totalSlots, availableSlots, bookedSlots, isOff: false }
}

/**
 * 향후 N일치 슬롯 요약 일괄 계산 및 저장
 */
export async function precomputeSlotSummaries(days: number = 28): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  const summaries: SlotSummary[] = []

  try {
    // 날짜 범위 계산
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dates: string[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    // 필요한 모든 데이터를 한 번에 조회
    const [doctors, templates, exceptions, bookings] = await Promise.all([
      prisma.doctor.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.scheduleTemplate.findMany({
        where: { isActive: true },
        select: { doctorId: true, dayOfWeek: true, startTime: true, endTime: true, slotIntervalMinutes: true },
      }),
      prisma.scheduleException.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { doctorId: true, date: true, type: true, customStart: true, customEnd: true, customInterval: true },
      }),
      prisma.appointment.groupBy({
        by: ['doctorId', 'date'],
        where: {
          date: { gte: startDate, lte: endDate },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        _count: { id: true },
      }),
    ])

    // 예외 Map
    const exceptionMap = new Map<string, typeof exceptions[0]>()
    for (const ex of exceptions) {
      exceptionMap.set(`${ex.doctorId}:${ex.date}`, ex)
    }

    // 예약 수 Map
    const bookedMap = new Map<string, number>()
    for (const b of bookings) {
      bookedMap.set(`${b.doctorId}:${b.date}`, b._count.id)
    }

    // 모든 의사 × 모든 날짜에 대해 계산
    for (const doctor of doctors) {
      for (const date of dates) {
        const summary = await calculateDaySlots(doctor.id, date, templates, exceptionMap, bookedMap)
        summaries.push(summary)
      }
    }

    // 일괄 upsert (트랜잭션)
    await prisma.$transaction(
      summaries.map(s =>
        prisma.dailySlotSummary.upsert({
          where: { doctorId_date: { doctorId: s.doctorId, date: s.date } },
          create: s,
          update: {
            totalSlots: s.totalSlots,
            availableSlots: s.availableSlots,
            bookedSlots: s.bookedSlots,
            isOff: s.isOff,
          },
        })
      )
    )

    return { updated: summaries.length, errors }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error')
    return { updated: 0, errors }
  }
}

/**
 * 특정 의사+날짜 슬롯 요약만 갱신
 * (예약 생성/취소 시 호출)
 */
export async function updateSlotSummary(doctorId: string, date: string): Promise<void> {
  try {
    const targetDate = new Date(date + 'T00:00:00')
    const dayOfWeek = targetDate.getDay()

    const [templates, exception, bookedCount] = await Promise.all([
      prisma.scheduleTemplate.findMany({
        where: { doctorId, dayOfWeek, isActive: true },
        select: { startTime: true, endTime: true, slotIntervalMinutes: true },
      }),
      prisma.scheduleException.findFirst({
        where: { doctorId, date },
      }),
      prisma.appointment.count({
        where: { doctorId, date, status: { in: ['PENDING', 'BOOKED'] } },
      }),
    ])

    // 휴진일 체크
    if (exception?.type === 'OFF') {
      await prisma.dailySlotSummary.upsert({
        where: { doctorId_date: { doctorId, date } },
        create: { doctorId, date, totalSlots: 0, availableSlots: 0, bookedSlots: 0, isOff: true },
        update: { totalSlots: 0, availableSlots: 0, bookedSlots: 0, isOff: true },
      })
      return
    }

    // 슬롯 생성
    let allSlots: string[] = []
    if (exception?.type === 'CUSTOM' && exception.customStart && exception.customEnd) {
      allSlots = generateTimeSlots(exception.customStart, exception.customEnd, exception.customInterval || 15)
    } else {
      for (const t of templates) {
        allSlots.push(...generateTimeSlots(t.startTime, t.endTime, t.slotIntervalMinutes))
      }
    }
    allSlots = [...new Set(allSlots)]

    const totalSlots = allSlots.length
    const availableSlots = Math.max(0, totalSlots - bookedCount)

    await prisma.dailySlotSummary.upsert({
      where: { doctorId_date: { doctorId, date } },
      create: { doctorId, date, totalSlots, availableSlots, bookedSlots: bookedCount, isOff: false },
      update: { totalSlots, availableSlots, bookedSlots: bookedCount, isOff: false },
    })
  } catch (error) {
    console.error('슬롯 요약 갱신 오류:', error)
  }
}

/**
 * 오래된 슬롯 요약 정리 (과거 데이터 삭제)
 */
export async function cleanupOldSummaries(): Promise<number> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const result = await prisma.dailySlotSummary.deleteMany({
    where: { date: { lt: yesterdayStr } },
  })

  return result.count
}

