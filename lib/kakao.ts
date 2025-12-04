/**
 * 카카오 OAuth 설정 및 유틸리티
 */

// 카카오 API 설정
export const KAKAO_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '',
  clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || '',
}

// 카카오 로그인 URL 생성
export function getKakaoLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: KAKAO_CONFIG.clientId,
    redirect_uri: KAKAO_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'profile_nickname profile_image',
  })
  
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

// 카카오 토큰 요청
export async function getKakaoToken(code: string): Promise<{
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
  scope: string
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KAKAO_CONFIG.clientId,
    redirect_uri: KAKAO_CONFIG.redirectUri,
    code,
  })

  if (KAKAO_CONFIG.clientSecret) {
    params.set('client_secret', KAKAO_CONFIG.clientSecret)
  }

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`카카오 토큰 요청 실패: ${error.error_description || error.error}`)
  }

  return response.json()
}

// 카카오 사용자 정보 조회
export interface KakaoUserInfo {
  id: number
  connected_at: string
  properties?: {
    nickname?: string
    profile_image?: string
    thumbnail_image?: string
  }
  kakao_account?: {
    profile_nickname_needs_agreement?: boolean
    profile_image_needs_agreement?: boolean
    profile?: {
      nickname?: string
      thumbnail_image_url?: string
      profile_image_url?: string
      is_default_image?: boolean
    }
    email_needs_agreement?: boolean
    is_email_valid?: boolean
    is_email_verified?: boolean
    email?: string
  }
}

export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  })

  if (!response.ok) {
    throw new Error('카카오 사용자 정보 조회 실패')
  }

  return response.json()
}

// 카카오 로그아웃
export async function kakaoLogout(accessToken: string): Promise<void> {
  await fetch('https://kapi.kakao.com/v1/user/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

