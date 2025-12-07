import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/schedule-exceptions
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')

    const exceptions = await prisma.scheduleException.findMany({
      where: doctorId ? { doctorId } : {},
      include: { doctor: { select: { id: true, name: true, department: true } } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ success: true, exceptions })
  } catch (error) {
    console.error('예외일 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/schedule-exceptions
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { doctorId, date, type, customStart, customEnd, customInterval, reason } = body

    if (!doctorId || !date || !type) {
      return NextResponse.json({ success: false, error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    if (type === 'CUSTOM' && (!customStart || !customEnd)) {
      return NextResponse.json({ success: false, error: 'CUSTOM 타입은 시작/종료 시간이 필요합니다.' }, { status: 400 })
    }

    const exception = await prisma.scheduleException.upsert({
      where: { doctorId_date: { doctorId, date } },
      update: {
        type,
        customStart: type === 'CUSTOM' ? customStart : null,
        customEnd: type === 'CUSTOM' ? customEnd : null,
        customInterval: type === 'CUSTOM' ? customInterval : null,
        reason,
      },
      create: {
        doctorId,
        date,
        type,
        customStart: type === 'CUSTOM' ? customStart : null,
        customEnd: type === 'CUSTOM' ? customEnd : null,
        customInterval: type === 'CUSTOM' ? customInterval : null,
        reason,
      },
    })

    return NextResponse.json({ success: true, exception })
  } catch (error) {
    console.error('예외일 저장 오류:', error)
    return NextResponse.json({ success: false, error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}


