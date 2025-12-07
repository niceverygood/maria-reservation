import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

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
