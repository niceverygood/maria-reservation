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
      orderBy: [{ doctorId: 'asc' }, { dayOfWeek: 'asc' }],
    })

    return NextResponse.json({ success: true, templates })
  } catch (error) {
    console.error('스케줄 템플릿 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/schedule-templates
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { doctorId, dayOfWeek, dayStartTime, dayEndTime, slotIntervalMinutes, dailyMaxAppointments } = body

    if (!doctorId || dayOfWeek === undefined || !dayStartTime || !dayEndTime) {
      return NextResponse.json({ success: false, error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    const template = await prisma.scheduleTemplate.upsert({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
      update: {
        dayStartTime,
        dayEndTime,
        slotIntervalMinutes: slotIntervalMinutes || 15,
        dailyMaxAppointments: dailyMaxAppointments || null,
        isActive: true,
      },
      create: {
        doctorId,
        dayOfWeek,
        dayStartTime,
        dayEndTime,
        slotIntervalMinutes: slotIntervalMinutes || 15,
        dailyMaxAppointments: dailyMaxAppointments || null,
      },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('스케줄 템플릿 저장 오류:', error)
    return NextResponse.json({ success: false, error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

