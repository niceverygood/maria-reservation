import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/doctors
 * 관리자용 - 의사 목록 조회
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const doctors = await prisma.doctor.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            scheduleTemplates: true,
            appointments: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, doctors })
  } catch (error) {
    console.error('의사 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '의사 목록 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/doctors
 * 관리자용 - 의사 등록
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, department, sortOrder = 0 } = body

    if (!name || !department) {
      return NextResponse.json({ success: false, error: '이름과 진료과를 입력해주세요.' }, { status: 400 })
    }

    const doctor = await prisma.doctor.create({
      data: { name, department, sortOrder },
    })

    return NextResponse.json({ success: true, doctor })
  } catch (error) {
    console.error('의사 등록 오류:', error)
    return NextResponse.json({ success: false, error: '의사 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

