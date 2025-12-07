import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/slots/count-by-date
 * 날짜별 예약 가능 여부 조회 (초고속 버전)
 * 
 * 최적화:
 * - 슬롯 수 대신 예약 가능 여부(있음/없음)만 반환
 * - 단일 쿼리로 예약된 슬롯만 조회
 * - 스케줄 계산 최소화
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate와 endDate가 필요합니다.' }, { status: 400 })
    }

    // 단일 쿼리: 날짜별 예약 수만 조회 (가장 빠름)
    const bookedCounts = await prisma.appointment.groupBy({
      by: ['date'],
      where: {
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'BOOKED'] },
      },
      _count: { id: true },
    })

    // 날짜별 예약 수 맵
    const bookedMap = new Map(bookedCounts.map(b => [b.date, b._count.id]))

    // 활성 의사 수 조회 (캐싱 가능)
    const doctorCount = await prisma.doctor.count({ where: { isActive: true } })

    // 평균 슬롯 수 추정 (의사당 하루 약 20슬롯 가정)
    const estimatedSlotsPerDay = doctorCount * 20

    // 날짜 범위 순회
    const counts: Record<string, number> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      
      // 일요일은 휴무 (0 = 일요일)
      if (dayOfWeek === 0) {
        counts[dateStr] = 0
        continue
      }

      // 과거 날짜는 0
      if (dateStr < todayStr) {
        counts[dateStr] = 0
        continue
      }

      // 예약된 수를 빼서 남은 슬롯 추정
      const booked = bookedMap.get(dateStr) || 0
      const available = Math.max(0, estimatedSlotsPerDay - booked)
      
      // 오늘이면 반으로 줄임 (이미 지난 시간 고려)
      counts[dateStr] = dateStr === todayStr ? Math.floor(available / 2) : available
    }

    return NextResponse.json({ success: true, counts })
  } catch (error) {
    console.error('날짜별 슬롯 수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
