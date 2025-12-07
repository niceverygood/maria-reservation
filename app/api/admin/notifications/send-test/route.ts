import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { sendReservationConfirmKakao } from '@/lib/notification/kakaoAlimtalk'

// 지점명 및 환자 웹 URL
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

/**
 * POST /api/admin/notifications/send-test
 * 테스트 알림 발송
 * 
 * Request Body:
 * {
 *   phone: string  // 테스트 발송 대상 전화번호
 * }
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '전화번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 전화번호 포맷 검증
    const cleanPhone = phone.replace(/-/g, '')
    if (!/^01\d{8,9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: '유효한 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 테스트 알림 발송
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    await sendReservationConfirmKakao({
      phone: cleanPhone,
      name: '테스트',
      date: dateStr,
      time: '14:00',
      doctorName: '홍길동',
      branchName: BRANCH_NAME,
      link: `${PATIENT_WEB_URL}/mypage`,
      appointmentId: 'test',
    })

    return NextResponse.json({
      success: true,
      message: `${cleanPhone}로 테스트 알림을 발송했습니다.`,
    })
  } catch (error) {
    console.error('테스트 알림 발송 오류:', error)
    return NextResponse.json(
      { success: false, error: '테스트 알림 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

