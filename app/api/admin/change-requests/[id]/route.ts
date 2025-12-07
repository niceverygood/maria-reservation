import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * PATCH /api/admin/change-requests/[id]
 * 변경 요청 처리 (승인/거절)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectReason } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 액션입니다.' }, { status: 400 })
    }

    // 변경 요청 조회
    const changeRequest = await prisma.scheduleChangeRequest.findUnique({
      where: { id },
    })

    if (!changeRequest) {
      return NextResponse.json({ success: false, error: '변경 요청을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (changeRequest.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: '이미 처리된 요청입니다.' }, { status: 400 })
    }

    if (action === 'approve') {
      // 승인 처리
      await prisma.scheduleChangeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedBy: admin.userId,
          processedAt: new Date(),
        },
      })

      // 요청 유형에 따라 실제 처리
      if (changeRequest.requestType === 'OFF_DAY' && changeRequest.offDate) {
        // 휴진일 등록
        await prisma.scheduleException.upsert({
          where: {
            doctorId_date: {
              doctorId: changeRequest.doctorId,
              date: changeRequest.offDate,
            },
          },
          update: {
            type: 'OFF',
            reason: changeRequest.offReason || '휴진',
          },
          create: {
            doctorId: changeRequest.doctorId,
            date: changeRequest.offDate,
            type: 'OFF',
            reason: changeRequest.offReason || '휴진',
          },
        })
      } else if (changeRequest.requestType === 'CANCEL' && changeRequest.appointmentId) {
        // 예약 취소
        await prisma.appointment.update({
          where: { id: changeRequest.appointmentId },
          data: { status: 'CANCELLED' },
        })
      } else if (changeRequest.requestType === 'RESCHEDULE' && changeRequest.appointmentId) {
        // 예약 일정 변경
        await prisma.appointment.update({
          where: { id: changeRequest.appointmentId },
          data: {
            date: changeRequest.newDate!,
            time: changeRequest.newTime!,
          },
        })
      }

      return NextResponse.json({ success: true, message: '요청이 승인되었습니다.' })
    } else {
      // 거절 처리
      await prisma.scheduleChangeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          processedBy: admin.userId,
          processedAt: new Date(),
          rejectReason: rejectReason || null,
        },
      })

      return NextResponse.json({ success: true, message: '요청이 거절되었습니다.' })
    }
  } catch (error) {
    console.error('변경 요청 처리 오류:', error)
    return NextResponse.json({ success: false, error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
