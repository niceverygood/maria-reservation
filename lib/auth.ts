import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'maria-hospital-reservation-secret-key-2024'
const TOKEN_EXPIRY = '24h' // 토큰 만료 시간

// 비밀번호 해시 생성
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// 비밀번호 검증
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT 토큰 생성
export interface TokenPayload {
  userId: string
  email: string
  name: string
  role: 'ADMIN' | 'STAFF' | 'DOCTOR'
  doctorId?: string  // 의사인 경우 의사 ID
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

// JWT 토큰 검증
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// 쿠키에서 토큰 가져오기 (서버 컴포넌트/API용)
export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_token')?.value || null
}

// 현재 로그인한 관리자/의사 정보 가져오기
export async function getCurrentAdmin(): Promise<TokenPayload | null> {
  const token = await getTokenFromCookies()
  if (!token) return null
  return verifyToken(token)
}

// 인증 필요한 API 라우트용 미들웨어 헬퍼
export async function requireAuth(): Promise<TokenPayload> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    throw new Error('인증이 필요합니다.')
  }
  return admin
}

// 관리자 권한 체크 (ADMIN 또는 STAFF만)
export async function requireAdmin(): Promise<TokenPayload> {
  const admin = await getCurrentAdmin()
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'STAFF')) {
    throw new Error('관리자 권한이 필요합니다.')
  }
  return admin
}

// 슈퍼 관리자 권한 체크 (ADMIN만)
export async function requireSuperAdmin(): Promise<TokenPayload> {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('슈퍼 관리자 권한이 필요합니다.')
  }
  return admin
}

// 쿠키 설정 옵션
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24시간
  path: '/',
}
