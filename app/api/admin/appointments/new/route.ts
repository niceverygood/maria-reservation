import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'

// 간단한 메모리 캐시 (3초 TTL)
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 3000

/**
 * GET /api/admin/appointments/new
 * 최근 N분 내 새 예약 및 변경된 예약 조회 (실시간 알림용)
 * 최적화: 토큰 검증만 수행, 병렬 쿼리, 캐싱
 */
export async function GET(request: Request) {
  try {
    // 토큰 검증만 수행 (DB 조회 없이)
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const minutes = parseInt(searchParams.get('minutes') || '5')
    const lastChecked = searchParams.get('lastChecked')

    const sinceTime = lastChecked 
      ? new Date(lastChecked)
      : new Date(Date.now() - minutes * 60 * 1000)

    // 캐시 확인 (lastChecked가 없을 때만 - 초기 로드)
    if (!lastChecked && cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    // 병렬로 두 쿼리 실행
    const [newAppointments, updatedCount] = await Promise.all([
      // 새 예약 조회 (필수 필드만)
      prisma.appointment.findMany({
        where: {
          reservedAt: { gt: sinceTime },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          reservedAt: true,
          doctor: { select: { name: true, department: true } },
          patient: { select: { name: true, phone: true } },
        },
        orderBy: { reservedAt: 'desc' },
        take: 10, // 20 → 10으로 줄임
      }),
      // 업데이트된 예약 개수만 조회 (상세 정보 불필요)
      prisma.appointment.count({
        where: {
          updatedAt: { gt: sinceTime },
          reservedAt: { lte: sinceTime },
        },
      }),
    ])

    const hasChanges = updatedCount > 0

    const response = {
      success: true,
      appointments: newAppointments.map(apt => ({
        id: apt.id,
        patientName: apt.patient.name,
        patientPhone: apt.patient.phone,
        doctorName: apt.doctor.name,
        department: apt.doctor.department,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        reservedAt: apt.reservedAt.toISOString(),
      })),
      count: newAppointments.length,
      hasChanges,
      updatedCount,
      checkedAt: new Date().toISOString(),
    }

    // 캐시 저장
    if (!lastChecked) {
      cache = { data: response, timestamp: Date.now() }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('새 예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '새 예약을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

