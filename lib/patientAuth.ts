/**
 * 환자 인증 관련 유틸리티
 */

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'maria-hospital-patient-secret'
const PATIENT_TOKEN_EXPIRY = '7d' // 7일

// 환자 토큰 페이로드
export interface PatientTokenPayload {
  patientId: string
  name: string
  kakaoId?: string
}

// JWT 토큰 생성 (환자용)
export function generatePatientToken(payload: PatientTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: PATIENT_TOKEN_EXPIRY })
}

// JWT 토큰 검증 (환자용)
export function verifyPatientToken(token: string): PatientTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PatientTokenPayload
  } catch {
    return null
  }
}

// 쿠키에서 환자 토큰 가져오기
export async function getPatientTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('patient-token')?.value || null
}

// 현재 로그인한 환자 정보 가져오기
export async function getCurrentPatient(): Promise<PatientTokenPayload | null> {
  const token = await getPatientTokenFromCookies()
  if (!token) return null
  return verifyPatientToken(token)
}

// 쿠키 설정 옵션
export const PATIENT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7일
  path: '/',
}


