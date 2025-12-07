import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/appointments/all
 * 관리자용 - 전체 예약 목록 조회 (날짜 필터 없음)
 * 
 * Query Parameters:
 * - doctorId: 의사 ID
 * - status: 예약 상태
 * - search: 환자명 또는 전화번호 검색
 * - startDate: 시작일 (YYYY-MM-DD)
 * - endDate: 종료일 (YYYY-MM-DD)
 * - emrSynced: EMR 등록 여부 (true/false)
 * - limit: 최대 조회 수 (기본값: 100)
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const emrSynced = searchParams.get('emrSynced')
    const limit = parseInt(searchParams.get('limit') || '100')

    // where 조건 구성
    const where: {
      doctorId?: string
      status?: string | { in: string[] }
      date?: { gte?: string; lte?: string }
      emrSynced?: boolean
      patient?: { OR: { name?: { contains: string }; phone?: { contains: string } }[] }
    } = {}

    if (doctorId) {
      where.doctorId = doctorId
    }

    if (status) {
      where.status = status
    } else {
      // 기본적으로 취소/거절 제외
      where.status = { in: ['PENDING', 'BOOKED', 'COMPLETED', 'NO_SHOW'] }
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    if (emrSynced !== null && emrSynced !== '') {
      where.emrSynced = emrSynced === 'true'
    }

    if (search && search.trim()) {
      where.patient = {
        OR: [
          { name: { contains: search.trim() } },
          { phone: { contains: search.trim() } },
        ],
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        memo: true,
        emrSynced: true,
        emrSyncedAt: true,
        reservedAt: true,
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
        { date: 'desc' },
        { time: 'asc' }
      ],
      take: limit,
    })

    // EMR 미등록 통계
    const emrStats = await prisma.appointment.groupBy({
      by: ['emrSynced'],
      where: {
        status: { in: ['BOOKED', 'COMPLETED'] }
      },
      _count: true
    })

    const emrNotSynced = emrStats.find(s => !s.emrSynced)?._count || 0
    const emrSyncedCount = emrStats.find(s => s.emrSynced)?._count || 0

    return NextResponse.json({
      success: true,
      appointments,
      total: appointments.length,
      emrStats: {
        notSynced: emrNotSynced,
        synced: emrSyncedCount
      }
    })
  } catch (error) {
    console.error('전체 예약 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

