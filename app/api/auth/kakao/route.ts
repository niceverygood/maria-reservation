import { NextResponse } from 'next/server'
import { getKakaoLoginUrl } from '@/lib/kakao'

/**
 * GET /api/auth/kakao
 * 카카오 로그인 페이지로 리다이렉트
 */
export async function GET() {
  const loginUrl = getKakaoLoginUrl()
  return NextResponse.redirect(loginUrl)
}


