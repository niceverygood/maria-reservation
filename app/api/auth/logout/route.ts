import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/logout
 * 환자 로그아웃
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('patient_token')

    return NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
    })
  } catch (error) {
    console.error('로그아웃 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

