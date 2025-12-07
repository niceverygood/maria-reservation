import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * PATCH /api/admin/appointments/[id]
 * 관리자용 - 예약 상태 변경
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

    const { id: appointmentId } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ success: false, error: '상태값이 필요합니다.' }, { status: 400 })
    }

    const validStatuses = ['PENDING', 'BOOKED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // 예약 조회
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 예약 상태 변경
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor: { select: { name: true, department: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: '예약 상태가 변경되었습니다.',
      appointment: updated,
    })
  } catch (error) {
    console.error('예약 상태 변경 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/appointments/[id]
 * 관리자용 - 단일 예약 조회
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

    const { id: appointmentId } = await params

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!appointment) {
      return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      appointment,
    })
  } catch (error) {
    console.error('예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/appointments/[id]
 * 관리자용 - 예약 삭제
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

    const { id: appointmentId } = await params

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    await prisma.appointment.delete({
      where: { id: appointmentId },
    })

    return NextResponse.json({
      success: true,
      message: '예약이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('예약 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

