import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * DELETE /api/admin/doctors/[id]/blocked-times/[blockedTimeId]
 * 시술시간(예약불가 시간) 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; blockedTimeId: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id, blockedTimeId } = await params

    // 해당 시술시간이 이 의사의 것인지 확인
    const blockedTime = await prisma.doctorBlockedTime.findFirst({
      where: { id: blockedTimeId, doctorId: id },
    })

    if (!blockedTime) {
      return NextResponse.json({ success: false, error: '시술시간을 찾을 수 없습니다.' }, { status: 404 })
    }

    await prisma.doctorBlockedTime.delete({
      where: { id: blockedTimeId },
    })

    return NextResponse.json({ success: true, message: '시술시간이 삭제되었습니다.' })
  } catch (error) {
    console.error('시술시간 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '시술시간 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/doctors/[id]/blocked-times/[blockedTimeId]
 * 시술시간(예약불가 시간) 수정
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockedTimeId: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id, blockedTimeId } = await params
    const body = await request.json()
    const { dayOfWeek, date, startTime, endTime, reason, isActive } = body

    // 해당 시술시간이 이 의사의 것인지 확인
    const blockedTime = await prisma.doctorBlockedTime.findFirst({
      where: { id: blockedTimeId, doctorId: id },
    })

    if (!blockedTime) {
      return NextResponse.json({ success: false, error: '시술시간을 찾을 수 없습니다.' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (date !== undefined) updateData.date = date
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (reason !== undefined) updateData.reason = reason
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await prisma.doctorBlockedTime.update({
      where: { id: blockedTimeId },
      data: updateData,
    })

    return NextResponse.json({ success: true, blockedTime: updated })
  } catch (error) {
    console.error('시술시간 수정 오류:', error)
    return NextResponse.json({ success: false, error: '시술시간 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}



