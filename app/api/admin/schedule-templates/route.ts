import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/schedule-templates
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')

    const templates = await prisma.scheduleTemplate.findMany({
      where: doctorId ? { doctorId } : {},
      include: { doctor: { select: { id: true, name: true, department: true } } },
      orderBy: [{ doctorId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ success: true, templates })
  } catch (error) {
    console.error('스케줄 템플릿 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/schedule-templates
 * 스케줄 템플릿 생성/수정
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { doctorId, dayOfWeek, startTime, endTime, slotIntervalMinutes, dailyMaxAppointments } = body

    // dayStartTime/dayEndTime 레거시 지원
    const actualStartTime = startTime || body.dayStartTime
    const actualEndTime = endTime || body.dayEndTime

    if (!doctorId || dayOfWeek === undefined || !actualStartTime || !actualEndTime) {
      return NextResponse.json({ success: false, error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    // 기존 템플릿 확인 (unique: doctorId + dayOfWeek + startTime)
    const existing = await prisma.scheduleTemplate.findFirst({
      where: {
        doctorId,
        dayOfWeek,
        startTime: actualStartTime,
      },
    })

    let template
    if (existing) {
      // 기존 템플릿 업데이트
      template = await prisma.scheduleTemplate.update({
        where: { id: existing.id },
        data: {
          endTime: actualEndTime,
          slotIntervalMinutes: slotIntervalMinutes || 15,
          dailyMaxAppointments: dailyMaxAppointments || null,
          isActive: true,
        },
      })
    } else {
      // 새 템플릿 생성
      template = await prisma.scheduleTemplate.create({
        data: {
          doctorId,
          dayOfWeek,
          startTime: actualStartTime,
          endTime: actualEndTime,
          slotIntervalMinutes: slotIntervalMinutes || 15,
          dailyMaxAppointments: dailyMaxAppointments || null,
        },
      })
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('스케줄 템플릿 저장 오류:', error)
    return NextResponse.json({ success: false, error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
