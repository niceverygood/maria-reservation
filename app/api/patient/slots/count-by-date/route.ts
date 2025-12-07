import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/slots/count-by-date
 * 날짜별 예약 가능 슬롯 수 조회 (초고속 버전)
 * 
 * 최적화:
 * - DailySlotSummary 테이블에서 사전 계산된 데이터 조회 (1개 쿼리)
 * - 사전 계산 데이터 없으면 실시간 추정치 반환
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate와 endDate가 필요합니다.' }, { status: 400 })
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // 1️⃣ 사전 계산된 슬롯 요약 조회 (단일 쿼리, 초고속)
    const summaries = await prisma.dailySlotSummary.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        availableSlots: true,
        isOff: true,
      },
    })

    // 사전 계산 데이터가 있으면 바로 반환
    if (summaries.length > 0) {
      const counts: Record<string, number> = {}
      
      // 날짜 범위 순회
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // 사전 계산 데이터를 맵으로 변환
      const summaryMap = new Map(summaries.map(s => [s.date, s]))
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const dayOfWeek = d.getDay()
        
        // 일요일 또는 과거는 0
        if (dayOfWeek === 0 || dateStr < todayStr) {
          counts[dateStr] = 0
          continue
        }
        
        const summary = summaryMap.get(dateStr)
        if (summary) {
          // 휴진일이면 0
          counts[dateStr] = summary.isOff ? 0 : summary.availableSlots
        } else {
          // 사전 계산 데이터 없으면 기본값
          counts[dateStr] = 20
        }
      }

      return NextResponse.json({ success: true, counts, source: 'precomputed' }, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      })
    }

    // 2️⃣ 폴백: 사전 계산 데이터 없으면 실시간 추정
    const [bookedCounts, doctorCount] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['date'],
        where: {
          date: { gte: startDate, lte: endDate },
          status: { in: ['PENDING', 'BOOKED'] },
        },
        _count: { id: true },
      }),
      prisma.doctor.count({ where: { isActive: true } }),
    ])

    const bookedMap = new Map(bookedCounts.map(b => [b.date, b._count.id]))
    const estimatedSlotsPerDay = doctorCount * 20

    const counts: Record<string, number> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      
      if (dayOfWeek === 0 || dateStr < todayStr) {
        counts[dateStr] = 0
        continue
      }

      const booked = bookedMap.get(dateStr) || 0
      const available = Math.max(0, estimatedSlotsPerDay - booked)
      counts[dateStr] = dateStr === todayStr ? Math.floor(available / 2) : available
    }

    return NextResponse.json({ success: true, counts, source: 'realtime' }, {
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    })
  } catch (error) {
    console.error('날짜별 슬롯 수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
