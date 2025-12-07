import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/appointments/today
 * 관리자용 - 오늘 예약 목록 조회 (최적화)
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

    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    // 예약 목록과 통계를 병렬로 조회
    const [appointments, statsResult] = await Promise.all([
      // 예약 목록 (필요한 필드만 select)
      prisma.appointment.findMany({
        where: { date: todayString },
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
        orderBy: { time: 'asc' },
      }),
      // 통계는 groupBy로 효율적 조회
      prisma.appointment.groupBy({
        by: ['status'],
        where: { date: todayString },
        _count: { id: true },
      }),
    ])

    // 통계 집계
    const stats = {
      total: 0,
      pending: 0,
      booked: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      noShow: 0,
    }

    for (const s of statsResult) {
      stats.total += s._count.id
      switch (s.status) {
        case 'PENDING': stats.pending = s._count.id; break
        case 'BOOKED': stats.booked = s._count.id; break
        case 'COMPLETED': stats.completed = s._count.id; break
        case 'CANCELLED': stats.cancelled = s._count.id; break
        case 'REJECTED': stats.rejected = s._count.id; break
        case 'NO_SHOW': stats.noShow = s._count.id; break
      }
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
