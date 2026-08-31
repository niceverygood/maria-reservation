/**
 * 예약 가능 슬롯 계산 로직
 * 
 * 이 모듈은 특정 의사, 특정 날짜에 대해 예약 가능한 시간 슬롯을 계산합니다.
 */

import prisma from '@/lib/db'

// 시간 문자열을 분으로 변환 (예: "09:30" -> 570)
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// 분을 시간 문자열로 변환 (예: 570 -> "09:30")
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// 날짜에서 요일 추출 (0: 일요일 ~ 6: 토요일)
export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString)
  return date.getDay()
}

// 시간 슬롯 배열 생성
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = []
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  for (let time = startMinutes; time < endMinutes; time += intervalMinutes) {
    slots.push(minutesToTime(time))
  }

  return slots
}

// 슬롯 정보 타입
export interface SlotInfo {
  time: string
  available: boolean
}

// 설정: 최소 예약 사전 시간 (분)
// 예: 60분이면 현재 시간으로부터 1시간 이내 슬롯은 예약 불가
const MIN_ADVANCE_MINUTES = 60

/**
 * 특정 의사, 특정 날짜의 예약 가능 슬롯을 계산합니다.
 * 
 * @param doctorId - 의사 ID
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 * @returns 슬롯 정보 배열
 */
export async function getAvailableSlots(
  doctorId: string,
  date: string
): Promise<SlotInfo[]> {
  // 1. 해당 날짜의 요일 계산
  const dayOfWeek = getDayOfWeek(date)

  // 2. 예외일 확인
  const exception = await prisma.scheduleException.findUnique({
    where: {
      doctorId_date: {
        doctorId,
        date,
      },
    },
  })

  // 2-1. 휴진(OFF)인 경우 빈 배열 반환
  if (exception?.type === 'OFF') {
    return []
  }

  let allSlots: string[] = []

  // 2-2. CUSTOM 스케줄인 경우
  if (exception?.type === 'CUSTOM' && exception.customStart && exception.customEnd) {
    const intervalMinutes = exception.customInterval || 15
    allSlots = generateTimeSlots(exception.customStart, exception.customEnd, intervalMinutes)
  } else {
    // 3. 기본 템플릿 조회 (해당 요일의 모든 스케줄 - 오전/오후 등)
    const templates = await prisma.scheduleTemplate.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // 템플릿이 없으면 빈 배열 반환 (해당 요일 진료 없음)
    if (templates.length === 0) {
      return []
    }

    // 모든 템플릿에서 슬롯 생성
    for (const template of templates) {
      const slots = generateTimeSlots(
        template.startTime,
        template.endTime,
        template.slotIntervalMinutes
      )
      allSlots.push(...slots)
    }
  }

  // 중복 제거 및 정렬
  allSlots = [...new Set(allSlots)].sort()

  // 4. 해당 날짜의 기존 예약 조회 (취소 제외)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date,
      status: { not: 'CANCELLED' },
    },
    select: {
      time: true,
    },
  })

  const bookedTimes = new Set(existingAppointments.map((a) => a.time))

  // 5. 현재 시간 기준 너무 촉박한 슬롯 필터링
  const now = new Date()
  const todayString = now.toISOString().split('T')[0]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 6. 슬롯별 가용 여부 계산
  const slots: SlotInfo[] = allSlots.map((time) => {
    // 이미 예약된 시간인지 확인
    if (bookedTimes.has(time)) {
      return { time, available: false }
    }

    // 오늘 날짜이고, 촉박한 시간인지 확인
    if (date === todayString && MIN_ADVANCE_MINUTES > 0) {
      const slotMinutes = timeToMinutes(time)
      if (slotMinutes - currentMinutes < MIN_ADVANCE_MINUTES) {
        return { time, available: false }
      }
    }

    // 과거 날짜 확인
    if (date < todayString) {
      return { time, available: false }
    }

    return { time, available: true }
  })

  return slots
}

/**
 * 예약 가능 여부를 확인합니다.
 * 
 * @param doctorId - 의사 ID
 * @param date - 예약 날짜
 * @param time - 예약 시간
 * @returns 예약 가능 여부
 */
export async function isSlotAvailable(
  doctorId: string,
  date: string,
  time: string
): Promise<boolean> {
  const slots = await getAvailableSlots(doctorId, date)
  const slot = slots.find((s) => s.time === time)
  return slot?.available ?? false
}

/**
 * 특정 기간 내의 예약 가능 날짜를 조회합니다.
 * 
 * @param doctorId - 의사 ID
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns 예약 가능한 날짜 배열
 */
export async function getAvailableDates(
  doctorId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const availableDates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0]
    const slots = await getAvailableSlots(doctorId, dateString)
    
    // 예약 가능한 슬롯이 하나라도 있으면 해당 날짜 추가
    if (slots.some((s) => s.available)) {
      availableDates.push(dateString)
    }
  }

  return availableDates
}
