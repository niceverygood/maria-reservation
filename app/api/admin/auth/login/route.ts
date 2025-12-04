import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/admin/auth/login
 * 관리자 로그인
 * 
 * Request Body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   user: { id, name, email, role }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 유효성 검사
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 사용자 조회
    const user = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 계정 활성화 여부 확인
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 401 }
      )
    }

    // 비밀번호 확인
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // JWT 토큰 생성
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'STAFF',
    })

    // 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, COOKIE_OPTIONS)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

