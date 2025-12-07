/**
 * 카카오 로그인 관련 유틸리티
 */

const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI

// 카카오 로그인 URL 생성
export function getKakaoLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID || '',
    redirect_uri: KAKAO_REDIRECT_URI || '',
    response_type: 'code',
    scope: 'profile_nickname,profile_image',
  })
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

// 카카오 토큰 발급
export async function getKakaoToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KAKAO_CLIENT_ID || '',
    redirect_uri: KAKAO_REDIRECT_URI || '',
    code,
  })

  // client_secret이 있으면 추가
  if (KAKAO_CLIENT_SECRET) {
    params.append('client_secret', KAKAO_CLIENT_SECRET)
  }

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('카카오 토큰 발급 실패:', errorData)
    throw new Error(`카카오 토큰 발급 실패: ${response.status}`)
  }

  return response.json()
}

// 카카오 사용자 정보 조회
export async function getKakaoUserInfo(accessToken: string): Promise<{
  id: number
  kakao_account?: {
    email?: string
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
  properties?: {
    nickname?: string
    profile_image?: string
  }
}> {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('카카오 사용자 정보 조회 실패:', errorData)
    throw new Error(`카카오 사용자 정보 조회 실패: ${response.status}`)
  }

  return response.json()
}

// 카카오 로그아웃
export async function kakaoLogout(accessToken: string): Promise<void> {
  try {
    await fetch('https://kapi.kakao.com/v1/user/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch (error) {
    console.error('카카오 로그아웃 실패:', error)
  }
}
