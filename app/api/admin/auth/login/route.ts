import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

/**
 * POST /api/admin/auth/login
 * 관리자/의사 로그인
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
 *   user: { id, name, email, role, doctorId? }
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

    // 1. 먼저 관리자 계정에서 조회
    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (adminUser) {
      // 관리자 계정 활성화 여부 확인
      if (!adminUser.isActive) {
        return NextResponse.json(
          { success: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
          { status: 401 }
        )
      }

      // 비밀번호 확인
      const isValid = await verifyPassword(password, adminUser.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401 }
        )
      }

      // JWT 토큰 생성 (관리자)
      const token = generateToken({
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role as 'ADMIN' | 'STAFF',
      })

      // 쿠키 설정
      const cookieStore = await cookies()
      cookieStore.set('admin_token', token, COOKIE_OPTIONS)

      return NextResponse.json({
        success: true,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      })
    }

    // 2. 관리자가 없으면 의사 계정에서 조회
    const doctor = await prisma.doctor.findFirst({
      where: { email },
    })

    if (doctor) {
      // 의사 계정 활성화 여부 확인
      if (!doctor.isActive) {
        return NextResponse.json(
          { success: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
          { status: 401 }
        )
      }

      // 비밀번호 확인
      if (!doctor.passwordHash) {
        return NextResponse.json(
          { success: false, error: '로그인 정보가 설정되지 않았습니다. 관리자에게 문의하세요.' },
          { status: 401 }
        )
      }

      const isValid = await bcrypt.compare(password, doctor.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401 }
        )
      }

      // JWT 토큰 생성 (의사)
      const token = generateToken({
        userId: doctor.id,
        email: doctor.email!,
        name: doctor.name,
        role: 'DOCTOR' as 'ADMIN' | 'STAFF',
        doctorId: doctor.id,
      })

      // 쿠키 설정
      const cookieStore = await cookies()
      cookieStore.set('admin_token', token, COOKIE_OPTIONS)

      return NextResponse.json({
        success: true,
        user: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          role: 'DOCTOR',
          doctorId: doctor.id,
          department: doctor.department,
        },
      })
    }

    // 3. 어디에도 없으면 오류
    return NextResponse.json(
      { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 }
    )
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
