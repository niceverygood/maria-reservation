import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { updateSlotSummary } from '@/lib/slots/precompute'

/**
 * GET /api/admin/blocked-times
 * 특정 날짜 차단 시간 목록 조회 (예외일 설정 화면용)
 *
 * 요일 반복 차단(date = null)은 의사 관리 화면에서 다루므로 제외하고,
 * 날짜가 지정된 1회성 차단만 반환합니다.
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')

    const blockedTimes = await prisma.doctorBlockedTime.findMany({
      where: {
        isActive: true,
        date: { not: null },
        ...(doctorId ? { doctorId } : {}),
      },
      include: { doctor: { select: { id: true, name: true, department: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ success: true, blockedTimes })
  } catch (error) {
    console.error('차단 시간 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/blocked-times
 * 특정 날짜 차단 시간 추가
 *
 * 예외일(ScheduleException)과 달리 의사+날짜 유니크 제약이 없으므로
 * 같은 날짜에 여러 구간을 등록할 수 있습니다.
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { doctorId, date, startTime, endTime, reason } = body

    if (!doctorId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: '의사, 날짜, 시작/종료 시간을 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { success: false, error: '종료 시간은 시작 시간보다 늦어야 합니다.' },
        { status: 400 }
      )
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) {
      return NextResponse.json({ success: false, error: '의사를 찾을 수 없습니다.' }, { status: 404 })
    }

    const blockedTime = await prisma.doctorBlockedTime.create({
      data: {
        doctorId,
        date,
        dayOfWeek: null,
        startTime,
        endTime,
        reason: reason || null,
      },
    })

    // 슬롯 요약 즉시 갱신 (야간 배치를 기다리지 않도록)
    updateSlotSummary(doctorId, date).catch(console.error)

    return NextResponse.json({ success: true, blockedTime })
  } catch (error) {
    console.error('차단 시간 추가 오류:', error)
    return NextResponse.json({ success: false, error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
