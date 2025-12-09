import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * GET /api/admin/patients
 * 환자 목록 조회
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where = search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { birthDate: { contains: search } },
      ],
    } : {}

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      patients: patients.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        birthDate: p.birthDate,
        kakaoId: p.kakaoId,
        appointmentCount: p._count.appointments,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('환자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '환자 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/patients
 * 새 환자 등록
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, birthDate } = body

    if (!name) {
      return NextResponse.json({ success: false, error: '이름은 필수입니다.' }, { status: 400 })
    }

    // 중복 체크
    const existing = await prisma.patient.findFirst({
      where: { name, birthDate, phone },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: '이미 등록된 환자입니다.' }, { status: 400 })
    }

    const patient = await prisma.patient.create({
      data: { name, phone, birthDate },
    })

    return NextResponse.json({ success: true, patient })
  } catch (error) {
    console.error('환자 등록 오류:', error)
    return NextResponse.json(
      { success: false, error: '환자 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




