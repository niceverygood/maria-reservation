import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/appointments/today
 * 관리자용 - 오늘 예약 목록 조회
 */
export async function GET() {
  try {
    // 인증 확인
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 오늘 날짜
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    const appointments = await prisma.appointment.findMany({
      where: {
        date: todayString,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { time: 'asc' },
      ],
    })

    // 통계 계산
    const stats = {
      total: appointments.length,
      booked: appointments.filter((a) => a.status === 'BOOKED').length,
      completed: appointments.filter((a) => a.status === 'COMPLETED').length,
      cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
      noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
    }

    return NextResponse.json({
      success: true,
      date: todayString,
      appointments,
      stats,
    })
  } catch (error) {
    console.error('오늘 예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

