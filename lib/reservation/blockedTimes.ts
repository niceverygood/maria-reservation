/**
 * 차단 시간(DoctorBlockedTime) 적용 로직
 *
 * 의사별 예약 불가 시간대를 슬롯 계산에서 제외하기 위한 공용 모듈입니다.
 * 슬롯을 계산하는 모든 경로(실시간 조회 / 야간 배치 / 단건 갱신)가
 * 이 모듈을 거치도록 하여 로직이 따로 놀지 않게 합니다.
 *
 * 차단 종류
 * - 특정 날짜 1회성 : date = 'YYYY-MM-DD'  (같은 날짜에 여러 건 등록 가능)
 * - 요일 반복       : date = null, dayOfWeek = 0~6
 * - 매일 반복       : date = null, dayOfWeek = null
 */

import prisma from '@/lib/db'

/** 차단 구간 (시작 포함, 종료 미포함) */
export interface BlockedTimeRange {
  startTime: string
  endTime: string
}

/** 차단 레코드 (적용 대상 판별에 필요한 필드) */
export interface BlockedTimeRecord extends BlockedTimeRange {
  doctorId: string
  dayOfWeek: number | null
  date: string | null
}

/** 조회 시 필요한 필드만 선택 */
const BLOCKED_TIME_SELECT = {
  doctorId: true,
  dayOfWeek: true,
  date: true,
  startTime: true,
  endTime: true,
} as const

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 특정 의사 + 특정 날짜에 적용되는 차단 구간만 골라냅니다.
 *
 * 같은 날짜에 여러 건이 등록되어 있으면 전부 반환합니다.
 */
export function selectBlocksFor(
  records: BlockedTimeRecord[],
  doctorId: string,
  date: string,
  dayOfWeek: number
): BlockedTimeRange[] {
  return records.filter(
    (record) =>
      record.doctorId === doctorId &&
      (record.date === date ||
        (record.date === null &&
          (record.dayOfWeek === null || record.dayOfWeek === dayOfWeek)))
  )
}

/**
 * 슬롯 하나가 차단 구간에 걸리는지 확인합니다.
 *
 * 구간은 [startTime, endTime) 으로 해석합니다.
 * (슬롯 생성 규칙이 endTime 미포함이므로 동일하게 맞춥니다)
 */
export function isTimeBlocked(time: string, blocks: BlockedTimeRange[]): boolean {
  if (blocks.length === 0) return false

  const target = toMinutes(time)
  return blocks.some(
    (block) => target >= toMinutes(block.startTime) && target < toMinutes(block.endTime)
  )
}

/** 차단 구간에 걸리는 슬롯을 제거합니다. */
export function removeBlockedSlots(slots: string[], blocks: BlockedTimeRange[]): string[] {
  if (blocks.length === 0) return slots
  return slots.filter((time) => !isTimeBlocked(time, blocks))
}

/**
 * 특정 의사 + 특정 날짜에 적용되는 차단 구간을 조회합니다.
 * (실시간 슬롯 조회 / 단건 갱신용)
 */
export async function getBlockedTimesForDate(
  doctorId: string,
  date: string,
  dayOfWeek: number
): Promise<BlockedTimeRange[]> {
  const records = await prisma.doctorBlockedTime.findMany({
    where: {
      doctorId,
      isActive: true,
      OR: [
        { date },
        { date: null, dayOfWeek },
        { date: null, dayOfWeek: null },
      ],
    },
    select: BLOCKED_TIME_SELECT,
  })

  return records
}

/**
 * 기간 내 모든 의사의 차단 시간을 한 번에 조회합니다.
 * (야간 배치용 — 의사×날짜 루프 안에서 개별 조회하지 않도록)
 */
export async function getBlockedTimeRecords(
  startDate: string,
  endDate: string
): Promise<BlockedTimeRecord[]> {
  return prisma.doctorBlockedTime.findMany({
    where: {
      isActive: true,
      OR: [
        { date: { gte: startDate, lte: endDate } },
        { date: null },
      ],
    },
    select: BLOCKED_TIME_SELECT,
  })
}
