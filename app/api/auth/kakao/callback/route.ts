import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getKakaoToken, getKakaoUserInfo } from '@/lib/kakao'
import { generatePatientToken, PATIENT_COOKIE_OPTIONS } from '@/lib/patientAuth'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('카카오 로그인 에러:', error)
      return NextResponse.redirect(new URL('/login?error=kakao_denied', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    // 카카오 토큰 발급
    const tokenData = await getKakaoToken(code)
    
    // 카카오 사용자 정보 조회
    const userInfo = await getKakaoUserInfo(tokenData.access_token)
    
    const kakaoId = String(userInfo.id)
    const nickname = userInfo.properties?.nickname || 
                    userInfo.kakao_account?.profile?.nickname || 
                    '사용자'
    const profileImage = userInfo.properties?.profile_image || 
                        userInfo.kakao_account?.profile?.profile_image_url

    // 환자 조회 또는 생성
    let patient = await prisma.patient.findUnique({
      where: { kakaoId },
    })

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: nickname,
          kakaoId,
          kakaoProfile: profileImage,
        },
      })
    } else {
      // 기존 환자 정보 업데이트
      patient = await prisma.patient.update({
        where: { kakaoId },
        data: {
          name: nickname,
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

    // 쿠키에 토큰 저장
    const cookieStore = await cookies()
    cookieStore.set('patient-token', token, PATIENT_COOKIE_OPTIONS)

    // 프로필 완성 여부 확인 (생년월일, 전화번호)
    if (!patient.birthDate || !patient.phone) {
      return NextResponse.redirect(new URL('/login/complete-profile', request.url))
    }

    // 리다이렉트 URL 확인
    const redirectUrl = searchParams.get('state') || '/mypage'
    return NextResponse.redirect(new URL(redirectUrl, request.url))

  } catch (error) {
    console.error('카카오 로그인 콜백 오류:', error)
    const message = error instanceof Error ? error.message : 'unknown'
    return NextResponse.redirect(new URL(`/login?error=callback_failed&reason=${encodeURIComponent(message.slice(0, 100))}`, request.url))
  }
}
