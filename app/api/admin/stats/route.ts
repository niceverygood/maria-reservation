import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '시작일과 종료일이 필요합니다.' },
        { status: 400 }
      )
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
      },
    })

    const stats = {
      total: appointments.length,
      pending: 0,
      booked: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      noShow: 0,
    }

    appointments.forEach((apt) => {
      switch (apt.status) {
        case 'PENDING':
          stats.pending++
          break
        case 'BOOKED':
          stats.booked++
          break
        case 'COMPLETED':
          stats.completed++
          break
        case 'CANCELLED':
          stats.cancelled++
          break
        case 'REJECTED':
          stats.rejected++
          break
        case 'NO_SHOW':
          stats.noShow++
          break
      }
    })

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

