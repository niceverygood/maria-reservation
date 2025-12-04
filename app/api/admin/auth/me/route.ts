import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/auth/me
 * 현재 로그인한 관리자 정보 조회
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin()

    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: admin.userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보를 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}

