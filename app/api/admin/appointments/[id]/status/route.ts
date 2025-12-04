import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * PATCH /api/admin/appointments/[id]/status
 * 관리자용 - 예약 상태 변경
 * 
 * Request Body:
 * {
 *   status: 'BOOKED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
 * }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    // 유효성 검사
    const validStatuses = ['BOOKED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      )
    }

    // 예약 존재 여부 확인
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    })

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 상태 업데이트
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        doctor: {
          select: {
            name: true,
            department: true,
          },
        },
        patient: {
          select: {
            name: true,
            birthDate: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    })
  } catch (error) {
    console.error('예약 상태 변경 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

