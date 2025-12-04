import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { getKakaoToken, getKakaoUserInfo } from '@/lib/kakao'
import { generatePatientToken, PATIENT_COOKIE_OPTIONS } from '@/lib/patientAuth'

/**
 * GET /api/auth/kakao/callback
 * 카카오 로그인 콜백 처리
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // 에러 처리
    if (error) {
      console.error('카카오 로그인 에러:', error)
      return NextResponse.redirect(new URL('/login?error=kakao_denied', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    // 카카오 토큰 요청
    const tokenData = await getKakaoToken(code)

    // 카카오 사용자 정보 조회
    const userInfo = await getKakaoUserInfo(tokenData.access_token)

    const kakaoId = userInfo.id.toString()
    const nickname = userInfo.properties?.nickname || 
                     userInfo.kakao_account?.profile?.nickname || 
                     '카카오 사용자'
    const email = userInfo.kakao_account?.email || null
    const profileImage = userInfo.properties?.profile_image || 
                         userInfo.kakao_account?.profile?.profile_image_url || 
                         null

    // 기존 환자 조회 또는 생성
    let patient = await prisma.patient.findUnique({
      where: { kakaoId },
    })

    if (!patient) {
      // 신규 카카오 사용자 - 환자 생성
      patient = await prisma.patient.create({
        data: {
          name: nickname,
          kakaoId,
          kakaoEmail: email,
          kakaoProfile: profileImage,
        },
      })
    } else {
      // 기존 사용자 - 정보 업데이트
      patient = await prisma.patient.update({
        where: { kakaoId },
        data: {
          name: nickname,
          kakaoEmail: email,
          kakaoProfile: profileImage,
        },
      })
    }

    // JWT 토큰 생성
    const token = generatePatientToken({
      patientId: patient.id,
      name: patient.name,
      kakaoId: patient.kakaoId || undefined,
    })

    // 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('patient_token', token, PATIENT_COOKIE_OPTIONS)

    // 추가 정보 입력이 필요한지 확인 (생년월일, 전화번호)
    if (!patient.birthDate || !patient.phone) {
      return NextResponse.redirect(new URL('/login/complete-profile', request.url))
    }

    // 예약 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/reserve', request.url))
  } catch (error) {
    console.error('카카오 로그인 콜백 오류:', error)
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown'
    console.error('카카오 로그인 콜백 오류:', message, error)

    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('error', 'callback_failed')
    redirectUrl.searchParams.set('reason', message.slice(0, 200))

    return NextResponse.redirect(redirectUrl)
  }
}

