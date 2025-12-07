import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/notifications/logs
 * 알림 발송 이력 조회
 * 
 * Query params:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 20)
 * - type: 알림 유형 필터 (CONFIRM, CANCEL, REMINDER_1DAY, REMINDER_TODAY, STATUS_CHANGE, RESCHEDULE, REJECTED)
 * - status: 발송 상태 필터 (PENDING, SENT, FAILED)
 * - startDate: 시작 날짜 (YYYY-MM-DD)
 * - endDate: 종료 날짜 (YYYY-MM-DD)
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 필터 조건 구성
    const where: Record<string, unknown> = {}
    
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.status = status
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, Date>).lte = end
      }
    }

    // 총 개수 조회
    const total = await prisma.notificationLog.count({ where })

    // 로그 목록 조회
    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // 통계 조회
    const stats = await prisma.notificationLog.groupBy({
      by: ['status'],
      _count: true,
      where: startDate || endDate ? where : undefined,
    })

    const statsMap = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    }
    
    stats.forEach(s => {
      statsMap.total += s._count
      if (s.status === 'SENT') statsMap.sent = s._count
      else if (s.status === 'FAILED') statsMap.failed = s._count
      else if (s.status === 'PENDING') statsMap.pending = s._count
    })

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statsMap,
    })
  } catch (error) {
    console.error('알림 로그 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '알림 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

