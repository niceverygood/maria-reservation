import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * GET /api/admin/appointments/count-by-date
 * 날짜별 예약 건수 조회 (캘린더 표시용)
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // 해당 월의 시작/끝 날짜
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    // 날짜별 예약 건수 조회
    const appointments = await prisma.appointment.groupBy({
      by: ['date', 'status'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    })

    // 날짜별 집계
    const countsByDate: Record<string, { total: number; pending: number; booked: number; completed: number; cancelled: number; rejected: number; noShow: number }> = {}

    for (const apt of appointments) {
      if (!countsByDate[apt.date]) {
        countsByDate[apt.date] = { total: 0, pending: 0, booked: 0, completed: 0, cancelled: 0, rejected: 0, noShow: 0 }
      }
      
      countsByDate[apt.date].total += apt._count.id
      
      switch (apt.status) {
        case 'PENDING':
          countsByDate[apt.date].pending += apt._count.id
          break
        case 'BOOKED':
          countsByDate[apt.date].booked += apt._count.id
          break
        case 'COMPLETED':
          countsByDate[apt.date].completed += apt._count.id
          break
        case 'CANCELLED':
          countsByDate[apt.date].cancelled += apt._count.id
          break
        case 'REJECTED':
          countsByDate[apt.date].rejected += apt._count.id
          break
        case 'NO_SHOW':
          countsByDate[apt.date].noShow += apt._count.id
          break
      }
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      counts: countsByDate,
    })
  } catch (error) {
    console.error('날짜별 예약 건수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

