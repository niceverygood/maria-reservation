import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// 간단한 메모리 캐시 (5초 TTL)
let cache: { data: unknown; timestamp: number; key: string } | null = null
const CACHE_TTL = 5000

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientName = searchParams.get('patientName')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50) // 최대 50으로 제한
    const skip = (page - 1) * limit

    // 캐시 키 생성
    const cacheKey = `${patientName}-${status}-${startDate}-${endDate}-${page}-${limit}`
    
    // 캐시 확인
    if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (patientName && patientName.trim()) {
      where.patient = {
        name: { contains: patientName.trim() },
      }
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    // 병렬 쿼리 실행
    const [totalCount, logs] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          memo: true,
          reservedAt: true,
          updatedAt: true,
          emrSynced: true,
          patient: {
            select: { id: true, name: true, phone: true, birthDate: true },
          },
          doctor: {
            select: { id: true, name: true, department: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    const response = {
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }

    // 캐시 저장
    cache = { data: response, timestamp: Date.now(), key: cacheKey }

    return NextResponse.json(response)
  } catch (error) {
    console.error('예약 로그 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 로그를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}









