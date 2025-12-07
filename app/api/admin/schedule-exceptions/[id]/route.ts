import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * DELETE /api/admin/schedule-exceptions/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    await prisma.scheduleException.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    console.error('예외일 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}


