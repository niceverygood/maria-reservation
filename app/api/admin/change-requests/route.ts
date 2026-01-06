import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// 간단한 메모리 캐시 (10초 TTL)
let cache: { data: unknown; timestamp: number; key: string } | null = null
const CACHE_TTL = 10000

/**
 * GET /api/admin/change-requests
 * 관리자용 - 모든 변경 요청 목록 조회 (최적화)
 */
export async function GET(request: Request) {
  try {
    // 토큰 검증 (DB 조회 없이)
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    const payload = token ? verifyToken(token) : null
    
    if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const doctorId = searchParams.get('doctorId')
    
    const cacheKey = `${status}-${doctorId || 'all'}`
    
    // 캐시 확인
    if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (doctorId) {
      where.doctorId = doctorId
    }

    // 단일 쿼리로 모든 데이터 조회 (최적화)
    const requests = await prisma.scheduleChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50, // 100 → 50으로 줄임
      select: {
        id: true,
        doctorId: true,
        appointmentId: true,
        requestType: true,
        originalDate: true,
        originalTime: true,
        newDate: true,
        newTime: true,
        offDate: true,
        offReason: true,
        reason: true,
        status: true,
        processedBy: true,
        processedAt: true,
        rejectReason: true,
        createdAt: true,
      },
    })

    // 필요한 ID들 추출
    const doctorIds = [...new Set(requests.map(r => r.doctorId))]
    const appointmentIds = requests.map(r => r.appointmentId).filter(Boolean) as string[]

    // 병렬로 조회 (2개 쿼리를 동시에)
    const [doctors, appointments] = await Promise.all([
      doctorIds.length > 0
        ? prisma.doctor.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, name: true, department: true },
          })
        : [],
      appointmentIds.length > 0
        ? prisma.appointment.findMany({
            where: { id: { in: appointmentIds } },
            select: {
              id: true,
              date: true,
              time: true,
              status: true,
              patient: { select: { name: true, phone: true } },
            },
          })
        : [],
    ])

    const doctorMap = new Map(doctors.map(d => [d.id, d]))
    const appointmentMap = new Map(appointments.map(a => [a.id, a]))

    const result = requests.map(r => ({
      ...r,
      doctor: doctorMap.get(r.doctorId),
      appointment: r.appointmentId ? appointmentMap.get(r.appointmentId) : null,
    }))

    const response = { success: true, requests: result }
    
    // 캐시 저장
    cache = { data: response, timestamp: Date.now(), key: cacheKey }

    return NextResponse.json(response)
  } catch (error) {
    console.error('변경 요청 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
