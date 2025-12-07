import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/stats
 * 통계 조회 (최적화 - groupBy 사용)
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '시작일과 종료일이 필요합니다.' },
        { status: 400 }
      )
    }

    // groupBy로 한 번에 집계 (각 행을 순회하지 않음)
    const statsResult = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    })

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

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
