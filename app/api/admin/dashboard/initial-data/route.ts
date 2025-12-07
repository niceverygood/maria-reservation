import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/dashboard/initial-data
 * 관리자 대시보드 진입 시 필요한 모든 데이터를 한 번에 반환
 * 
 * Response:
 * - todayAppointments: 오늘 예약 목록
 * - todayStats: 오늘 예약 통계
 * - pendingCount: 승인 대기 예약 수
 * - doctors: 활성 의사 목록
 * - recentAppointments: 최근 예약 5건 (빠른 확인용)
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

    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    // 모든 데이터를 병렬로 조회
    const [
      todayAppointments,
      todayStatsResult,
      pendingCount,
      doctors,
      recentAppointments,
    ] = await Promise.all([
      // 오늘 예약 목록
      prisma.appointment.findMany({
        where: { date: todayString },
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          memo: true,
          doctor: {
            select: { id: true, name: true, department: true },
          },
          patient: {
            select: { id: true, name: true, birthDate: true, phone: true },
          },
        },
        orderBy: { time: 'asc' },
      }),
      
      // 오늘 예약 통계 (groupBy)
      prisma.appointment.groupBy({
        by: ['status'],
        where: { date: todayString },
        _count: { id: true },
      }),
      
      // 승인 대기 예약 수
      prisma.appointment.count({
        where: { status: 'PENDING' },
      }),
      
      // 활성 의사 목록
      prisma.doctor.findMany({
        where: { isActive: true },
        select: { id: true, name: true, department: true },
        orderBy: { sortOrder: 'asc' },
      }),
      
      // 최근 예약 5건
      prisma.appointment.findMany({
        orderBy: { reservedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          reservedAt: true,
          doctor: {
            select: { name: true, department: true },
          },
          patient: {
            select: { name: true, phone: true },
          },
        },
      }),
    ])

    // 오늘 통계 집계
    const todayStats = {
      total: 0,
      pending: 0,
      booked: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      noShow: 0,
    }

    for (const s of todayStatsResult) {
      todayStats.total += s._count.id
      switch (s.status) {
        case 'PENDING': todayStats.pending = s._count.id; break
        case 'BOOKED': todayStats.booked = s._count.id; break
        case 'COMPLETED': todayStats.completed = s._count.id; break
        case 'CANCELLED': todayStats.cancelled = s._count.id; break
        case 'REJECTED': todayStats.rejected = s._count.id; break
        case 'NO_SHOW': todayStats.noShow = s._count.id; break
      }
    }

    return NextResponse.json({
      success: true,
      date: todayString,
      todayAppointments,
      todayStats,
      pendingCount,
      doctors,
      recentAppointments,
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10', // 10초 캐시
      },
    })
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

