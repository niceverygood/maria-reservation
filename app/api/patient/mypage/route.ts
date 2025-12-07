import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPatientToken } from '@/lib/patientAuth'
import prisma from '@/lib/db'

/**
 * GET /api/patient/mypage
 * 마이페이지 전용 API - 환자 정보 + 예약 목록을 한 번에 조회 (최적화)
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

    // 환자 정보와 예약 목록을 병렬로 한 번에 조회
    const [patient, appointments] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: payload.patientId },
        select: {
          id: true,
          name: true,
          birthDate: true,
          phone: true,
          kakaoId: true,
          kakaoProfile: true,
        },
      }),
      prisma.appointment.findMany({
        where: { patientId: payload.patientId },
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          doctor: {
            select: {
              id: true,
              name: true,
              department: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        take: 30, // 최근 30개만 (마이페이지용)
      }),
    ])

    if (!patient) {
      return NextResponse.json({ success: false, error: '환자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 오늘 날짜 기준으로 예약 분류
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const upcoming = appointments.filter(
      a => a.date >= todayStr && (a.status === 'PENDING' || a.status === 'BOOKED')
    )
    const past = appointments.filter(
      a => a.date < todayStr || !['PENDING', 'BOOKED'].includes(a.status)
    )

    return NextResponse.json({
      success: true,
      patient,
      appointments: {
        upcoming,
        past,
        total: appointments.length,
      },
      isProfileComplete: !!(patient.birthDate && patient.phone),
    })
  } catch (error) {
    console.error('마이페이지 데이터 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

