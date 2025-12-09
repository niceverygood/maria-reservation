import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/doctors/count-by-date
 * 날짜별 예약 가능한 의사 수 조회
 * 
 * Query: startDate, endDate (YYYY-MM-DD)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate와 endDate가 필요합니다.' }, { status: 400 })
    }

    // 모든 스케줄 템플릿 조회
    const scheduleTemplates = await prisma.scheduleTemplate.findMany({
      where: { isActive: true },
      select: { doctorId: true, dayOfWeek: true },
    })

    // 해당 기간의 휴진 조회
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        type: 'OFF',
      },
      select: { doctorId: true, date: true },
    })

    // 날짜별 휴진 맵 생성
    const exceptionMap: Record<string, Set<string>> = {}
    for (const exc of exceptions) {
      if (!exceptionMap[exc.date]) {
        exceptionMap[exc.date] = new Set()
      }
      exceptionMap[exc.date].add(exc.doctorId)
    }

    // 요일별 의사 ID Set 생성
    const doctorsByDayOfWeek: Record<number, Set<string>> = {}
    for (const template of scheduleTemplates) {
      if (!doctorsByDayOfWeek[template.dayOfWeek]) {
        doctorsByDayOfWeek[template.dayOfWeek] = new Set()
      }
      doctorsByDayOfWeek[template.dayOfWeek].add(template.doctorId)
    }

    // 날짜별 의사 수 계산
    const counts: Record<string, number> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay() // 0(일) ~ 6(토)
      
      const doctorsOnDay = doctorsByDayOfWeek[dayOfWeek] || new Set()
      const exceptedDoctors = exceptionMap[dateStr] || new Set()
      
      // 해당 요일에 근무하는 의사 중 휴진이 아닌 의사 수
      let count = 0
      for (const doctorId of doctorsOnDay) {
        if (!exceptedDoctors.has(doctorId)) {
          count++
        }
      }
      
      counts[dateStr] = count
    }

    return NextResponse.json({ success: true, counts })
  } catch (error) {
    console.error('날짜별 의사 수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




