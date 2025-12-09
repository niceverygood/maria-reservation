/**
 * 카카오 알림톡 발송 모듈 (ALIGO API)
 * https://smartsms.aligo.in 사용
 * 
 * 환경변수 설정 필요 (.env):
 * ALIGO_API_KEY=emv0p0khgywmdl5wtt1aidjnx95dicdz
 * ALIGO_USER_ID=golfpeople
 * ALIGO_SENDER_KEY=072dd3d32fdd6a1e9f24d133f01868060b95fd86
 * ALIGO_SENDER_PHONE=0310000000  # 발신번호 (병원 대표번호)
 */

import prisma from '@/lib/db'

// 알림 유형
export type NotificationType = 
  | 'CONFIRM'        // 예약 확정
  | 'CANCEL'         // 예약 취소
  | 'REMINDER_1DAY'  // 1일 전 리마인더
  | 'REMINDER_TODAY' // 당일 리마인더
  | 'STATUS_CHANGE'  // 상태 변경
  | 'RESCHEDULE'     // 예약 변경
  | 'REJECTED'       // 예약 거절

// 알림톡 발송 파라미터 타입
export interface AlimtalkParams {
  phone: string           // 01012345678
  name: string            // 환자명
  date: string            // YYYY-MM-DD
  time: string            // HH:MM
  doctorName: string      // 담당의사명
  branchName: string      // 지점명 (예: 일산마리아병원)
  link: string            // 예약 확인 링크
  appointmentId?: string  // 예약 ID (로깅용)
}

// 환경변수 (Vercel 환경변수에서 설정)
const API_KEY = process.env.ALIGO_API_KEY || ''
const USER_ID = process.env.ALIGO_USER_ID || ''
const SENDER_KEY = process.env.ALIGO_SENDER_KEY || ''
const SENDER_PHONE = process.env.ALIGO_SENDER_PHONE || '07041479771'

// 템플릿 코드 (ALIGO에서 승인받은 코드)
const TEMPLATES = {
  CONFIRM: process.env.ALIGO_TEMPLATE_CONFIRM || 'UE_0163',           // 마리아 예약확정 ✅
  CANCEL: process.env.ALIGO_TEMPLATE_CANCEL || 'UE_0164',             // 마리아 예약취소 ✅
  REMINDER_1DAY: process.env.ALIGO_TEMPLATE_REMINDER_1DAY || '',      // 1일전 리마인더 ❌ 등록 필요
  REMINDER_TODAY: process.env.ALIGO_TEMPLATE_REMINDER_TODAY || 'UE_0897',  // 마리아_당일리마인더 ⏳ 검수중
  STATUS_CHANGE: process.env.ALIGO_TEMPLATE_STATUS || '',             // 상태변경 ❌ 등록 필요
  RESCHEDULE: process.env.ALIGO_TEMPLATE_RESCHEDULE || '',            // 예약변경 ❌ 등록 필요
  REJECTED: process.env.ALIGO_TEMPLATE_REJECTED || 'UE_0898',         // 예약 거절 ⏳ 검수중
}

// ALIGO API URL
const ALIGO_API_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'

/**
 * 전화번호 포맷팅 (하이픈 제거)
 */
function formatPhone(phone: string): string {
  return phone.replace(/-/g, '')
}

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일)
 */
function formatDateKorean(date: string): string {
  const [year, month, day] = date.split('-')
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`
}

/**
 * 요일 가져오기
 */
function getDayOfWeek(date: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(date)
  return days[d.getDay()]
}

/**
 * 알림 로그 저장
 */
async function saveNotificationLog(
  type: NotificationType,
  params: AlimtalkParams,
  templateCode: string,
  message: string,
  status: 'PENDING' | 'SENT' | 'FAILED',
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        type,
        channel: 'ALIMTALK',
        recipientPhone: formatPhone(params.phone),
        recipientName: params.name,
        appointmentId: params.appointmentId,
        templateCode,
        message,
        status,
        errorMessage,
        sentAt: status === 'SENT' ? new Date() : null,
      },
    })
  } catch (error) {
    console.error('[알림톡] 로그 저장 실패:', error)
  }
}

/**
 * ALIGO 알림톡 API 호출
 */
async function sendAlimtalk(
  type: NotificationType,
  params: AlimtalkParams,
  templateCode: string,
  message: string,
  buttonUrl?: string
): Promise<boolean> {
  // 환경변수 디버깅 로그
  console.log('[알림톡] === 발송 시작 ===')
  console.log('[알림톡] 유형:', type)
  console.log('[알림톡] 발송 대상:', params.phone)
  console.log('[알림톡] 템플릿:', templateCode)
  console.log('[알림톡] API_KEY 설정:', API_KEY ? '✅' : '❌')
  console.log('[알림톡] USER_ID 설정:', USER_ID ? '✅' : '❌')
  console.log('[알림톡] SENDER_KEY 설정:', SENDER_KEY ? '✅' : '❌')
  console.log('[알림톡] SENDER_PHONE:', SENDER_PHONE)

  // 환경변수가 설정되지 않은 경우 스킵 (개발 환경)
  if (!API_KEY || !USER_ID || !SENDER_KEY) {
    console.log('[알림톡] ⚠️ 환경변수 미설정 - 개발 모드 발송')
    console.log('[알림톡] 메시지:\n', message)
    
    // 개발 환경에서도 로그 저장
    await saveNotificationLog(type, params, templateCode, message, 'SENT')
    return true
  }

  try {
    // FormData 생성
    const formData = new URLSearchParams()
    formData.append('apikey', API_KEY)
    formData.append('userid', USER_ID)
    formData.append('senderkey', SENDER_KEY)
    formData.append('tpl_code', templateCode)
    formData.append('sender', SENDER_PHONE)
    formData.append('receiver_1', formatPhone(params.phone))
    formData.append('subject_1', templateCode)
    formData.append('message_1', message)
    
    // 버튼이 있는 경우
    if (buttonUrl) {
      formData.append('button_1', JSON.stringify({
        button: [
          {
            name: '예약 확인하기',
            linkType: 'WL',
            linkTypeName: '웹링크',
            linkMo: buttonUrl,
            linkPc: buttonUrl,
          }
        ]
      }))
    }

    const response = await fetch(ALIGO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const result = await response.json()

    if (result.code === 0 || result.code === '0') {
      console.log(`[알림톡] 발송 성공 - ${params.phone}, 유형: ${type}`)
      await saveNotificationLog(type, params, templateCode, message, 'SENT')
      return true
    } else {
      console.error(`[알림톡] 발송 실패 - 코드: ${result.code}, 메시지: ${result.message}`)
      await saveNotificationLog(type, params, templateCode, message, 'FAILED', result.message)
      return false
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[알림톡] API 호출 오류:', error)
    await saveNotificationLog(type, params, templateCode, message, 'FAILED', errorMsg)
    return false
  }
}

/**
 * 예약 확정 알림톡 발송
 * 템플릿: 마리아 예약확정 (ALIGO에 등록된 템플릿과 정확히 일치해야 함)
 */
export async function sendReservationConfirmKakao(params: AlimtalkParams): Promise<void> {
  try {
    const dayOfWeek = getDayOfWeek(params.date)
    const dateWithDay = `${formatDateKorean(params.date)} (${dayOfWeek})`
    
    // ALIGO 템플릿과 정확히 일치하는 메시지 (#{변수}를 실제 값으로 치환)
    const message = `[일산마리아병원] 예약이 확정되었습니다.

■ 예약 정보
- 환자명: ${params.name}
- 예약일시: ${dateWithDay} ${params.time}
- 담당의: ${params.doctorName}

예약 변경/취소는 마이페이지에서 가능합니다.

※ 예약시간 10분 전까지 내원해 주세요.`

    await sendAlimtalk('CONFIRM', params, TEMPLATES.CONFIRM, message, params.link)
  } catch (error) {
    console.error('[알림톡] 예약 확정 알림 발송 중 오류:', error)
  }
}

/**
 * 예약 취소 알림톡 발송
 * 템플릿: 마리아 예약취소 (ALIGO에 등록된 템플릿과 정확히 일치해야 함)
 */
export async function sendReservationCancelKakao(params: AlimtalkParams): Promise<void> {
  try {
    const dayOfWeek = getDayOfWeek(params.date)
    const dateWithDay = `${formatDateKorean(params.date)} (${dayOfWeek})`
    
    // ALIGO 템플릿과 정확히 일치하는 메시지
    const message = `[일산마리아병원] 예약이 취소되었습니다.

■ 취소된 예약 정보
- 환자명: ${params.name}
- 예약일시: ${dateWithDay} ${params.time}
- 담당의: ${params.doctorName}

새로운 예약은 아래 버튼을 눌러주세요.`

    await sendAlimtalk('CANCEL', params, TEMPLATES.CANCEL, message, params.link)
  } catch (error) {
    console.error('[알림톡] 예약 취소 알림 발송 중 오류:', error)
  }
}

/**
 * 예약 승인 알림톡 발송 (관리자가 PENDING -> BOOKED 변경 시)
 */
export async function sendReservationApprovedKakao(params: AlimtalkParams): Promise<void> {
  return sendReservationConfirmKakao(params)
}

/**
 * 예약 거절 알림톡 발송 (관리자가 PENDING -> REJECTED 변경 시)
 * 템플릿: 예약 거절 UE_0898 - 한글 변수명 사용
 */
export async function sendReservationRejectedKakao(params: AlimtalkParams): Promise<void> {
  try {
    const dayOfWeek = getDayOfWeek(params.date)
    const dateWithDay = `${formatDateKorean(params.date)} (${dayOfWeek}) ${params.time}`
    
    // ALIGO 템플릿 UE_0898과 정확히 일치 (한글 변수명)
    const message = `[${params.branchName}] 예약이 거절되었습니다.

■ 거절된 예약 정보
- 환자명: ${params.name}
- 요청일시: ${dateWithDay}
- 담당의: ${params.doctorName}

죄송합니다. 해당 시간에 예약이 불가능합니다.
다른 시간으로 다시 예약해 주세요.`

    await sendAlimtalk('REJECTED', params, TEMPLATES.REJECTED, message, params.link)
  } catch (error) {
    console.error('[알림톡] 예약 거절 알림 발송 중 오류:', error)
  }
}

/**
 * 예약 변경 알림톡 발송
 */
export async function sendReservationRescheduleKakao(
  params: AlimtalkParams,
  oldDate: string,
  oldTime: string
): Promise<void> {
  try {
    const oldDayOfWeek = getDayOfWeek(oldDate)
    const newDayOfWeek = getDayOfWeek(params.date)
    const message = `[${params.branchName}] 예약이 변경되었습니다.

■ 기존 예약
- ${formatDateKorean(oldDate)} (${oldDayOfWeek}) ${oldTime}

■ 변경된 예약
- 환자명: ${params.name}
- 예약일시: ${formatDateKorean(params.date)} (${newDayOfWeek}) ${params.time}
- 담당의: ${params.doctorName}

※ 변경된 시간에 내원해 주세요.`

    await sendAlimtalk('RESCHEDULE', params, TEMPLATES.RESCHEDULE, message, params.link)
  } catch (error) {
    console.error('[알림톡] 예약 변경 알림 발송 중 오류:', error)
  }
}

/**
 * 1일 전 리마인더 알림톡 발송
 * 템플릿: 마리아_예약리마인더 (ALIGO에 등록 필요)
 */
export async function sendReminder1DayKakao(params: AlimtalkParams): Promise<void> {
  try {
    const dayOfWeek = getDayOfWeek(params.date)
    const dateWithDay = `${formatDateKorean(params.date)} (${dayOfWeek})`
    
    // ALIGO 템플릿과 정확히 일치하는 메시지
    const message = `[일산마리아병원] 내일 예약이 있습니다.

■ 예약 정보
- 환자명: ${params.name}
- 예약일시: ${dateWithDay} ${params.time}
- 담당의: ${params.doctorName}

※ 예약시간 10분 전까지 내원해 주세요.
※ 예약 변경/취소는 마이페이지에서 가능합니다.`

    await sendAlimtalk('REMINDER_1DAY', params, TEMPLATES.REMINDER_1DAY, message, params.link)
  } catch (error) {
    console.error('[알림톡] 1일전 리마인더 발송 중 오류:', error)
  }
}

/**
 * 당일 리마인더 알림톡 발송
 * 템플릿: 마리아_당일리마인더 UE_0897 - 한글 변수명 사용
 */
export async function sendReminderTodayKakao(params: AlimtalkParams): Promise<void> {
  try {
    // ALIGO 템플릿 UE_0897과 정확히 일치 (한글 변수명)
    const message = `[${params.branchName}] 오늘 예약이 있습니다.

■ 예약 정보
- 환자명: ${params.name}
- 예약시간: ${params.time}
- 담당의: ${params.doctorName}

곧 뵙겠습니다! 😊
※ 예약시간 10분 전까지 내원해 주세요.`

    await sendAlimtalk('REMINDER_TODAY', params, TEMPLATES.REMINDER_TODAY, message, params.link)
  } catch (error) {
    console.error('[알림톡] 당일 리마인더 발송 중 오류:', error)
  }
}

/**
 * 상태 변경 알림톡 발송 (완료, 노쇼 등)
 */
export async function sendStatusChangeKakao(
  params: AlimtalkParams,
  newStatus: string
): Promise<void> {
  try {
    const statusLabels: Record<string, string> = {
      'COMPLETED': '진료 완료',
      'NO_SHOW': '미방문 처리',
      'BOOKED': '예약 확정',
    }
    
    const statusLabel = statusLabels[newStatus] || newStatus
    const dayOfWeek = getDayOfWeek(params.date)
    
    const message = `[${params.branchName}] 예약 상태가 변경되었습니다.

■ 예약 정보
- 환자명: ${params.name}
- 예약일시: ${formatDateKorean(params.date)} (${dayOfWeek}) ${params.time}
- 담당의: ${params.doctorName}
- 상태: ${statusLabel}

감사합니다.`

    await sendAlimtalk('STATUS_CHANGE', params, TEMPLATES.STATUS_CHANGE, message, params.link)
  } catch (error) {
    console.error('[알림톡] 상태 변경 알림 발송 중 오류:', error)
  }
}

/**
 * 알림 발송 가능 여부 확인
 */
export function isNotificationEnabled(): boolean {
  // 환경변수로 알림 기능 끄기 가능
  if (process.env.NOTIFICATION_ENABLED === 'false') {
    return false
  }
  return true
}

/**
 * 알림 설정 가져오기
 */
export async function getNotificationSettings(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.notificationSetting.findMany()
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, string>)
  } catch {
    return {}
  }
}

/**
 * 알림 설정 업데이트
 */
export async function updateNotificationSetting(key: string, value: string, description?: string): Promise<void> {
  await prisma.notificationSetting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  })
}
