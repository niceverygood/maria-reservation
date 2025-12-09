/**
 * 예약 리마인더 서비스
 * - 1일 전 리마인더 (전날 저녁 또는 아침)
 * - 당일 리마인더 (예약 당일 아침)
 * 
 * 최적화:
 * - 병렬 처리로 발송 속도 향상
 * - 배치 처리로 API rate limit 방지
 */

import prisma from '@/lib/db'
import { sendReminder1DayKakao, sendReminderTodayKakao, AlimtalkParams } from './kakaoAlimtalk'

// 지점명 및 환자 웹 URL
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

// 배치 설정
const BATCH_SIZE = 10  // 한 번에 처리할 알림 수
const BATCH_DELAY = 500 // 배치 간 딜레이 (ms)

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 딜레이 함수
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 배치 처리로 알림 발송
 */
async function sendInBatches<T>(
  items: T[],
  sendFn: (item: T) => Promise<void>,
  batchSize: number = BATCH_SIZE
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const result = { sent: 0, failed: 0, errors: [] as string[] }
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    const results = await Promise.allSettled(
      batch.map(item => sendFn(item))
    )
    
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        result.sent++
      } else {
        result.failed++
        result.errors.push(`배치 ${Math.floor(i / batchSize) + 1}-${idx + 1}: ${r.reason?.message || '알 수 없는 오류'}`)
      }
    })
    
    // 마지막 배치가 아니면 딜레이
    if (i + batchSize < items.length) {
      await delay(BATCH_DELAY)
    }
  }
  
  return result
}

/**
 * 1일 전 리마인더 발송 (최적화: 병렬 배치 처리)
 * - 내일 예약된 환자들에게 알림 발송
 * - 보통 전날 오후 6시경 실행
 */
export async function sendReminders1Day(): Promise<{
  total: number
  sent: number
  failed: number
  errors: string[]
}> {
  const result = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // 내일 날짜 계산 (한국 시간 기준)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatDate(tomorrow)

    // 내일 예약된 BOOKED 상태의 예약들 조회 (전화번호 있는 것만)
    const appointments = await prisma.appointment.findMany({
      where: {
        date: tomorrowStr,
        status: 'BOOKED',
        patient: {
          phone: { not: null },
        },
      },
      select: {
        id: true,
        date: true,
        time: true,
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
    })

    result.total = appointments.length
    console.log(`[리마인더] 1일전 리마인더 대상: ${result.total}건 (${tomorrowStr})`)

    if (appointments.length === 0) {
      return result
    }

    // 알림 파라미터 준비
    const notifications = appointments.map(apt => ({
      phone: apt.patient.phone!,
      name: apt.patient.name,
      date: apt.date,
      time: apt.time,
      doctorName: apt.doctor.name,
      branchName: BRANCH_NAME,
      link: `${PATIENT_WEB_URL}/mypage`,
      appointmentId: apt.id,
    }))

    // 배치 처리로 발송
    const batchResult = await sendInBatches(
      notifications,
      (params: AlimtalkParams) => sendReminder1DayKakao(params)
    )

    result.sent = batchResult.sent
    result.failed = batchResult.failed
    result.errors = batchResult.errors

    console.log(`[리마인더] 1일전 발송 완료 - 성공: ${result.sent}, 실패: ${result.failed}`)
  } catch (error) {
    console.error('[리마인더] 1일전 리마인더 처리 중 오류:', error)
    throw error
  }

  return result
}

/**
 * 당일 리마인더 발송 (최적화: 병렬 배치 처리)
 * - 오늘 예약된 환자들에게 알림 발송
 * - 보통 당일 아침 8시경 실행
 */
export async function sendRemindersToday(): Promise<{
  total: number
  sent: number
  failed: number
  errors: string[]
}> {
  const result = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // 오늘 날짜
    const today = new Date()
    const todayStr = formatDate(today)
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`

    // 오늘 예약된 BOOKED 상태의 예약들 조회 (전화번호 있고, 아직 지나지 않은 예약만)
    const appointments = await prisma.appointment.findMany({
      where: {
        date: todayStr,
        status: 'BOOKED',
        time: {
          gt: currentTime,
        },
        patient: {
          phone: { not: null },
        },
      },
      select: {
        id: true,
        date: true,
        time: true,
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
    })

    result.total = appointments.length
    console.log(`[리마인더] 당일 리마인더 대상: ${result.total}건 (${todayStr})`)

    if (appointments.length === 0) {
      return result
    }

    // 알림 파라미터 준비
    const notifications = appointments.map(apt => ({
      phone: apt.patient.phone!,
      name: apt.patient.name,
      date: apt.date,
      time: apt.time,
      doctorName: apt.doctor.name,
      branchName: BRANCH_NAME,
      link: `${PATIENT_WEB_URL}/mypage`,
      appointmentId: apt.id,
    }))

    // 배치 처리로 발송
    const batchResult = await sendInBatches(
      notifications,
      (params: AlimtalkParams) => sendReminderTodayKakao(params)
    )

    result.sent = batchResult.sent
    result.failed = batchResult.failed
    result.errors = batchResult.errors

    console.log(`[리마인더] 당일 발송 완료 - 성공: ${result.sent}, 실패: ${result.failed}`)
  } catch (error) {
    console.error('[리마인더] 당일 리마인더 처리 중 오류:', error)
    throw error
  }

  return result
}

/**
 * 리마인더 설정 조회
 */
export async function getReminderSettings() {
  try {
    const settings = await prisma.notificationSetting.findMany({
      where: {
        key: {
          startsWith: 'reminder_',
        },
      },
    })

    return {
      reminder1DayEnabled: settings.find(s => s.key === 'reminder_1day_enabled')?.value === 'true',
      reminder1DayTime: settings.find(s => s.key === 'reminder_1day_time')?.value || '18:00',
      reminderTodayEnabled: settings.find(s => s.key === 'reminder_today_enabled')?.value === 'true',
      reminderTodayTime: settings.find(s => s.key === 'reminder_today_time')?.value || '08:00',
    }
  } catch {
    return {
      reminder1DayEnabled: true,
      reminder1DayTime: '18:00',
      reminderTodayEnabled: true,
      reminderTodayTime: '08:00',
    }
  }
}



