import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { broadcastStatusUpdate } from '@/lib/ws/serverClient'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            phone: true
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      appointment
    })
  } catch (error) {
    console.error('예약 조회 오류:', error)
    return NextResponse.json({ success: false, error: '예약 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/appointments/[id]
 * 예약 상태 변경
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ success: false, error: '상태를 입력해주세요.' }, { status: 400 })
    }

    const validStatuses = ['PENDING', 'BOOKED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        doctor: { select: { id: true, name: true } },
        patient: { select: { name: true } }
      }
    })

    // WebSocket 브로드캐스트
    broadcastStatusUpdate({
      id: appointment.id,
      status: appointment.status,
      date: appointment.date,
      doctorId: appointment.doctorId
    })

    return NextResponse.json({
      success: true,
      appointment
    })
  } catch (error) {
    console.error('예약 상태 변경 오류:', error)
    return NextResponse.json({ success: false, error: '상태 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
