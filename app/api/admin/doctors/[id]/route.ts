import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

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
    const { name, department, isActive, sortOrder } = body

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
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

