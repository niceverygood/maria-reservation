/**
 * 카카오 알림톡 테스트 스크립트
 * 
 * 실행: npx ts-node --project tsconfig.json scripts/test-alimtalk.ts
 * 또는: npx tsx scripts/test-alimtalk.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ALIGO 설정
const ALIGO_API_KEY = process.env.ALIGO_API_KEY || ''
const ALIGO_USER_ID = process.env.ALIGO_USER_ID || ''
const ALIGO_SENDER_KEY = process.env.ALIGO_SENDER_KEY || ''
const ALIGO_SENDER_PHONE = process.env.ALIGO_SENDER_PHONE || ''
const ALIGO_API_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'

// 템플릿 코드 - ALIGO에서 승인받은 실제 템플릿 코드
const TEMPLATE_CODE = process.env.ALIGO_TEMPLATE_CONFIRM || 'UE_0163'  // 마리아 예약확정

// 테스트 발송 대상 전화번호 (본인 번호로 변경하세요!)
const TEST_PHONE = process.argv[2] || '01012345678'

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

async function testAlimtalk() {
  console.log('========================================')
  console.log('카카오 알림톡 테스트')
  console.log('========================================')
  
  // 환경변수 확인
  console.log('\n[환경변수 확인]')
  console.log('ALIGO_API_KEY:', ALIGO_API_KEY ? '✅ 설정됨' : '❌ 미설정')
  console.log('ALIGO_USER_ID:', ALIGO_USER_ID ? '✅ 설정됨' : '❌ 미설정')
  console.log('ALIGO_SENDER_KEY:', ALIGO_SENDER_KEY ? '✅ 설정됨' : '❌ 미설정')
  console.log('ALIGO_SENDER_PHONE:', ALIGO_SENDER_PHONE ? '✅ 설정됨' : '❌ 미설정')
  console.log('TEMPLATE_CODE:', TEMPLATE_CODE)
  
  if (!ALIGO_API_KEY || !ALIGO_USER_ID || !ALIGO_SENDER_KEY) {
    console.log('\n⚠️ 환경변수가 설정되지 않았습니다.')
    console.log('개발 모드로 테스트 메시지만 출력합니다.\n')
    
    // 테스트 데이터
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    const dayOfWeek = getDayOfWeek(dateStr)
    const dateWithDay = `${formatDateKorean(dateStr)} (${dayOfWeek})`
    
    const message = `[일산마리아병원] 예약이 확정되었습니다.

■ 예약 정보
- 환자명: 테스트
- 예약일시: ${dateWithDay} 14:00
- 담당의: 홍길동

예약 변경/취소는 마이페이지에서 가능합니다.

※ 예약시간 10분 전까지 내원해 주세요.`

    console.log('[발송 대상]', TEST_PHONE)
    console.log('[템플릿 코드]', TEMPLATE_CODE)
    console.log('[메시지 내용]')
    console.log('----------------------------------------')
    console.log(message)
    console.log('----------------------------------------')
    
    // 로그 저장 테스트
    try {
      await prisma.notificationLog.create({
        data: {
          type: 'CONFIRM',
          channel: 'ALIMTALK',
          recipientPhone: TEST_PHONE.replace(/-/g, ''),
          recipientName: '테스트',
          appointmentId: null,
          templateCode: TEMPLATE_CODE,
          message,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
      console.log('\n✅ 로그 저장 성공 (개발 모드)')
    } catch (error) {
      console.error('\n❌ 로그 저장 실패:', error)
    }
    
    return
  }
  
  // 실제 ALIGO API 호출
  console.log('\n[실제 알림톡 발송 시도]')
  console.log('발송 대상:', TEST_PHONE)
  
  try {
    // 테스트 데이터
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    const dayOfWeek = getDayOfWeek(dateStr)
    const dateWithDay = `${formatDateKorean(dateStr)} (${dayOfWeek})`
    
    const message = `[일산마리아병원] 예약이 확정되었습니다.

■ 예약 정보
- 환자명: 테스트
- 예약일시: ${dateWithDay} 14:00
- 담당의: 홍길동

예약 변경/취소는 마이페이지에서 가능합니다.

※ 예약시간 10분 전까지 내원해 주세요.`
    
    console.log('\n[메시지 내용]')
    console.log('----------------------------------------')
    console.log(message)
    console.log('----------------------------------------')
    
    // FormData 생성
    const formData = new URLSearchParams()
    formData.append('apikey', ALIGO_API_KEY)
    formData.append('userid', ALIGO_USER_ID)
    formData.append('senderkey', ALIGO_SENDER_KEY)
    formData.append('tpl_code', TEMPLATE_CODE)
    formData.append('sender', ALIGO_SENDER_PHONE)
    formData.append('receiver_1', TEST_PHONE.replace(/-/g, ''))
    formData.append('subject_1', TEMPLATE_CODE)
    formData.append('message_1', message)
    
    console.log('\n[API 호출 중...]')
    
    const response = await fetch(ALIGO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    
    const result = await response.json()
    
    console.log('\n[API 응답]')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.code === 0 || result.code === '0') {
      console.log('\n✅ 알림톡 발송 성공!')
      
      // 로그 저장
      await prisma.notificationLog.create({
        data: {
          type: 'CONFIRM',
          channel: 'ALIMTALK',
          recipientPhone: TEST_PHONE.replace(/-/g, ''),
          recipientName: '테스트',
          appointmentId: null,
          templateCode: TEMPLATE_CODE,
          message,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } else {
      console.log('\n❌ 알림톡 발송 실패')
      console.log('에러 코드:', result.code)
      console.log('에러 메시지:', result.message)
      
      // 실패 로그 저장
      await prisma.notificationLog.create({
        data: {
          type: 'CONFIRM',
          channel: 'ALIMTALK',
          recipientPhone: TEST_PHONE.replace(/-/g, ''),
          recipientName: '테스트',
          appointmentId: null,
          templateCode: TEMPLATE_CODE,
          message,
          status: 'FAILED',
          errorMessage: result.message,
        },
      })
    }
  } catch (error) {
    console.error('\n❌ API 호출 오류:', error)
  }
}

testAlimtalk()
  .then(() => {
    console.log('\n========================================')
    console.log('테스트 완료')
    console.log('========================================')
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())

