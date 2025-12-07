import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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
      select: {
        id: true,
        name: true,
        department: true,
        position: true,
        email: true,
        isActive: true,
        sortOrder: true,
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
    const { name, department, sortOrder = 0, email, password } = body

    if (!name || !department) {
      return NextResponse.json({ success: false, error: '이름과 진료과를 입력해주세요.' }, { status: 400 })
    }

    // 이메일 중복 확인
    if (email) {
      const existingDoctor = await prisma.doctor.findFirst({
        where: { email },
      })
      if (existingDoctor) {
        return NextResponse.json({ success: false, error: '이미 사용 중인 이메일입니다.' }, { status: 400 })
      }
      
      // 관리자 이메일과도 중복 확인
      const existingAdmin = await prisma.adminUser.findFirst({
        where: { email },
      })
      if (existingAdmin) {
        return NextResponse.json({ success: false, error: '이미 사용 중인 이메일입니다.' }, { status: 400 })
      }
    }

    // 비밀번호 해싱
    let passwordHash: string | undefined
    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        department,
        sortOrder,
        email: email || null,
        passwordHash: passwordHash || null,
      },
    })

    return NextResponse.json({ success: true, doctor })
  } catch (error) {
    console.error('의사 등록 오류:', error)
    return NextResponse.json({ success: false, error: '의사 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
