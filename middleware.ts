import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 도메인 기반 라우팅 미들웨어
 * 
 * 설정 예시:
 * - admin.maria-hospital.com → /admin/* 페이지만 접근 가능
 * - www.maria-hospital.com → 환자 페이지만 접근 가능
 * - reserve.maria-hospital.com → 환자 페이지만 접근 가능
 * 
 * 환경변수:
 * - ADMIN_DOMAIN: 관리자 도메인 (예: admin.maria-hospital.com)
 * - PATIENT_DOMAIN: 환자 도메인 (예: www.maria-hospital.com)
 */

// 환경변수에서 도메인 설정 가져오기
const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || ''
const PATIENT_DOMAIN = process.env.PATIENT_DOMAIN || ''

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // API 요청은 통과
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 정적 파일은 통과
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // 파일 확장자가 있는 경우
  ) {
    return NextResponse.next()
  }

  // 개발 환경에서는 도메인 체크 스킵
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // 도메인 설정이 없으면 통과
  if (!ADMIN_DOMAIN && !PATIENT_DOMAIN) {
    return NextResponse.next()
  }

  // 관리자 도메인 체크
  if (ADMIN_DOMAIN && hostname.includes(ADMIN_DOMAIN)) {
    // 관리자 도메인에서 환자 페이지 접근 시 리다이렉트
    if (!pathname.startsWith('/admin')) {
      // 루트 접근 시 관리자 대시보드로
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      // 그 외 환자 페이지는 접근 불가
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 환자 도메인 체크
  if (PATIENT_DOMAIN && hostname.includes(PATIENT_DOMAIN)) {
    // 환자 도메인에서 관리자 페이지 접근 시 차단
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}




