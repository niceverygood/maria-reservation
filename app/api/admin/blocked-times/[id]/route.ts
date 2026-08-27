import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { updateSlotSummary } from '@/lib/slots/precompute'

/**
 * DELETE /api/admin/blocked-times/[id]
 * 차단 시간 삭제
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

    const blockedTime = await prisma.doctorBlockedTime.findUnique({ where: { id } })
    if (!blockedTime) {
      return NextResponse.json({ success: false, error: '차단 시간을 찾을 수 없습니다.' }, { status: 404 })
    }

    await prisma.doctorBlockedTime.delete({ where: { id } })

    // 슬롯 요약 즉시 갱신
    if (blockedTime.date) {
      updateSlotSummary(blockedTime.doctorId, blockedTime.date).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('차단 시간 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
