import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

/**
 * GET /api/admin/doctors/[id]
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
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        scheduleTemplates: { orderBy: { dayOfWeek: 'asc' } },
        scheduleExceptions: { orderBy: { date: 'desc' }, take: 10 },
      },
    })

    if (!doctor) {
      return NextResponse.json({ success: false, error: '의사를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, doctor })
  } catch (error) {
    console.error('의사 조회 오류:', error)
    return NextResponse.json({ success: false, error: '의사 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/doctors/[id]
 */
export async function PATCH(
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
    const { name, department, isActive, sortOrder, email, password } = body

    // 이메일 중복 확인 (자신 제외)
    if (email) {
      const existingDoctor = await prisma.doctor.findFirst({
        where: { email, id: { not: id } },
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

    // 비밀번호 해싱 (비밀번호가 입력된 경우만)
    let passwordHash: string | undefined
    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (department !== undefined) updateData.department = department
    if (isActive !== undefined) updateData.isActive = isActive
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (email !== undefined) updateData.email = email || null
    if (passwordHash) updateData.passwordHash = passwordHash

    const doctor = await prisma.doctor.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, doctor })
  } catch (error) {
    console.error('의사 수정 오류:', error)
    return NextResponse.json({ success: false, error: '의사 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/doctors/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id } = await params
    await prisma.doctor.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '의사가 삭제되었습니다.' })
  } catch (error) {
    console.error('의사 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '의사 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
