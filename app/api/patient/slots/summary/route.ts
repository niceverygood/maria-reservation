import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/slots/summary
 * 사전 계산된 슬롯 요약 조회 (초고속)
 * 
 * Query:
 * - startDate: 시작일 (YYYY-MM-DD)
 * - endDate: 종료일 (YYYY-MM-DD)
 * - doctorId?: 특정 의사만 조회
 * 
 * Response:
 * - counts: { [date]: availableSlots }
 * - doctors: { [doctorId]: { [date]: availableSlots } }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const doctorId = searchParams.get('doctorId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate와 endDate가 필요합니다.' },
        { status: 400 }
      )
    }

    // 사전 계산된 데이터 조회 (매우 빠름!)
    const summaries = await prisma.dailySlotSummary.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(doctorId ? { doctorId } : {}),
      },
      select: {
        doctorId: true,
        date: true,
        availableSlots: true,
        isOff: true,
      },
    })

    // 날짜별 총 가용 슬롯 집계
    const counts: Record<string, number> = {}
    const doctors: Record<string, Record<string, number>> = {}

    for (const s of summaries) {
      // 날짜별 총합
      if (!counts[s.date]) counts[s.date] = 0
      counts[s.date] += s.availableSlots

      // 의사별 날짜별
      if (!doctors[s.doctorId]) doctors[s.doctorId] = {}
      doctors[s.doctorId][s.date] = s.availableSlots
    }

    // 오늘 이전 날짜는 0으로 설정
    const today = new Date().toISOString().split('T')[0]
    for (const date of Object.keys(counts)) {
      if (date < today) counts[date] = 0
    }

    return NextResponse.json({
      success: true,
      counts,
      doctors,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('슬롯 요약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

