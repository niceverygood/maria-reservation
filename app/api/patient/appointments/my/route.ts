import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPatientToken } from '@/lib/patientAuth'
import prisma from '@/lib/db'

/**
 * GET /api/patient/appointments/my
 * 로그인한 환자의 예약 목록 조회 (최적화 버전)
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('patient-token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const payload = await verifyPatientToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: '인증이 만료되었습니다.' }, { status: 401 })
    }

    // 최적화된 쿼리 - 필요한 필드만 선택
    const appointments = await prisma.appointment.findMany({
      where: { patientId: payload.patientId },
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        memo: true,
        doctor: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: 50, // 최근 50개만
    })

    return NextResponse.json({
      success: true,
      appointments,
    })
  } catch (error) {
    console.error('내 예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
