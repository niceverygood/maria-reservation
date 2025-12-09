/**
 * 모든 알림톡 템플릿 테스트 스크립트
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ALIGO 설정
const ALIGO_API_KEY = process.env.ALIGO_API_KEY || ''
const ALIGO_USER_ID = process.env.ALIGO_USER_ID || ''
const ALIGO_SENDER_KEY = process.env.ALIGO_SENDER_KEY || ''
const ALIGO_SENDER_PHONE = process.env.ALIGO_SENDER_PHONE || '07041479771'
const ALIGO_API_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'

// 템플릿 코드
const TEMPLATES = {
  CONFIRM: 'UE_0163',      // 예약 확정
  CANCEL: 'UE_0164',       // 예약 취소
  REMINDER_TODAY: 'UE_0897', // 당일 리마인더
  REJECTED: 'UE_0898',     // 예약 거절
}

// 테스트 발송 대상 전화번호
const TEST_PHONE = process.argv[2] || '01087399771'
const TEST_TYPE = process.argv[3] || 'all' // all, confirm, cancel, reminder, rejected

// 날짜 포맷팅
function formatDateKorean(date: string): string {
  const [year, month, day] = date.split('-')
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`
}

function getDayOfWeek(date: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(date)
  return days[d.getDay()]
}

// 내일 날짜
function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
}

// 알림톡 발송
async function sendAlimtalk(
  templateCode: string,
  message: string,
  description: string
): Promise<boolean> {
  console.log(`\n[${'='.repeat(50)}]`)
  console.log(`[테스트] ${description}`)
  console.log(`[템플릿] ${templateCode}`)
  console.log(`[메시지]\n${message}`)
  console.log(`[${'='.repeat(50)}]`)

  if (!ALIGO_API_KEY || !ALIGO_USER_ID || !ALIGO_SENDER_KEY) {
    console.log('⚠️ 환경변수 미설정 - 스킵')
    return false
  }

  try {
    const formData = new URLSearchParams()
    formData.append('apikey', ALIGO_API_KEY)
    formData.append('userid', ALIGO_USER_ID)
    formData.append('senderkey', ALIGO_SENDER_KEY)
    formData.append('tpl_code', templateCode)
    formData.append('sender', ALIGO_SENDER_PHONE)
    formData.append('receiver_1', TEST_PHONE.replace(/-/g, ''))
    formData.append('subject_1', templateCode)
    formData.append('message_1', message)

    const response = await fetch(ALIGO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const result = await response.json()

    if (result.code === 0 || result.code === '0') {
      console.log(`✅ 발송 성공!`)
      return true
    } else {
      console.log(`❌ 발송 실패: ${result.message}`)
      return false
    }
  } catch (error) {
    console.error(`❌ API 오류:`, error)
    return false
  }
}

// 테스트 함수들
async function testConfirm() {
  const date = getTomorrowDate()
  const dayOfWeek = getDayOfWeek(date)
  const dateWithDay = `${formatDateKorean(date)} (${dayOfWeek})`
  
  const message = `[일산마리아병원] 예약이 확정되었습니다.

■ 예약 정보
- 환자명: 테스트
- 예약일시: ${dateWithDay} 14:00
- 담당의: 홍길동

예약 변경/취소는 마이페이지에서 가능합니다.

※ 예약시간 10분 전까지 내원해 주세요.`

  return sendAlimtalk(TEMPLATES.CONFIRM, message, '예약 확정')
}

async function testCancel() {
  const date = getTomorrowDate()
  const dayOfWeek = getDayOfWeek(date)
  const dateWithDay = `${formatDateKorean(date)} (${dayOfWeek})`
  
  const message = `[일산마리아병원] 예약이 취소되었습니다.

■ 취소된 예약 정보
- 환자명: 테스트
- 예약일시: ${dateWithDay} 14:00
- 담당의: 홍길동

새로운 예약은 아래 버튼을 눌러주세요.`

  return sendAlimtalk(TEMPLATES.CANCEL, message, '예약 취소')
}

async function testReminderToday() {
  const message = `[일산마리아병원] 오늘 예약이 있습니다.

■ 예약 정보
- 환자명: 테스트
- 예약시간: 14:00
- 담당의: 홍길동

곧 뵙겠습니다! 😊
※ 예약시간 10분 전까지 내원해 주세요.`

  return sendAlimtalk(TEMPLATES.REMINDER_TODAY, message, '당일 리마인더')
}

async function testRejected() {
  const date = getTomorrowDate()
  const dayOfWeek = getDayOfWeek(date)
  const dateWithDay = `${formatDateKorean(date)} (${dayOfWeek}) 14:00`
  
  const message = `[일산마리아병원] 예약이 거절되었습니다.

■ 거절된 예약 정보
- 환자명: 테스트
- 요청일시: ${dateWithDay}
- 담당의: 홍길동

죄송합니다. 해당 시간에 예약이 불가능합니다.
다른 시간으로 다시 예약해 주세요.`

  return sendAlimtalk(TEMPLATES.REJECTED, message, '예약 거절')
}

// 메인 실행
async function main() {
  console.log('========================================')
  console.log('카카오 알림톡 전체 테스트')
  console.log('========================================')
  console.log(`발송 대상: ${TEST_PHONE}`)
  console.log(`테스트 유형: ${TEST_TYPE}`)
  
  const results: { name: string; success: boolean }[] = []

  if (TEST_TYPE === 'all' || TEST_TYPE === 'confirm') {
    results.push({ name: '예약 확정', success: await testConfirm() })
    await new Promise(r => setTimeout(r, 1000)) // 1초 딜레이
  }

  if (TEST_TYPE === 'all' || TEST_TYPE === 'cancel') {
    results.push({ name: '예약 취소', success: await testCancel() })
    await new Promise(r => setTimeout(r, 1000))
  }

  if (TEST_TYPE === 'all' || TEST_TYPE === 'reminder') {
    results.push({ name: '당일 리마인더', success: await testReminderToday() })
    await new Promise(r => setTimeout(r, 1000))
  }

  if (TEST_TYPE === 'all' || TEST_TYPE === 'rejected') {
    results.push({ name: '예약 거절', success: await testRejected() })
  }

  console.log('\n========================================')
  console.log('테스트 결과')
  console.log('========================================')
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`)
  })
  console.log('========================================')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

