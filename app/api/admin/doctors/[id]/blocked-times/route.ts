import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/doctors/[id]/blocked-times
 * 의사별 시술시간(예약불가 시간) 목록 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const blockedTimes = await prisma.doctorBlockedTime.findMany({
      where: { doctorId: id, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ success: true, blockedTimes })
  } catch (error) {
    console.error('시술시간 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '시술시간 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/doctors/[id]/blocked-times
 * 시술시간(예약불가 시간) 추가
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { dayOfWeek, date, startTime, endTime, reason } = body

    if (!startTime || !endTime) {
      return NextResponse.json({ success: false, error: '시작 시간과 종료 시간을 입력해주세요.' }, { status: 400 })
    }

    // 의사 존재 확인
    const doctor = await prisma.doctor.findUnique({ where: { id } })
    if (!doctor) {
      return NextResponse.json({ success: false, error: '의사를 찾을 수 없습니다.' }, { status: 404 })
    }

    const blockedTime = await prisma.doctorBlockedTime.create({
      data: {
        doctorId: id,
        dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? dayOfWeek : null,
        date: date || null,
        startTime,
        endTime,
        reason: reason || null,
      },
    })

    return NextResponse.json({ success: true, blockedTime })
  } catch (error) {
    console.error('시술시간 추가 오류:', error)
    return NextResponse.json({ success: false, error: '시술시간 추가 중 오류가 발생했습니다.' }, { status: 500 })
  }
}



