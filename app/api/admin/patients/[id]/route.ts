import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * GET /api/admin/patients/[id]
 * 환자 상세 조회 (예약 내역 포함)
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

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            doctor: { select: { name: true, department: true } },
          },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ success: false, error: '환자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        birthDate: patient.birthDate,
        kakaoId: patient.kakaoId,
        kakaoEmail: patient.kakaoEmail,
        createdAt: patient.createdAt.toISOString(),
        appointments: patient.appointments.map(apt => ({
          id: apt.id,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          doctorName: apt.doctor.name,
          department: apt.doctor.department,
          memo: apt.memo,
        })),
      },
    })
  } catch (error) {
    console.error('환자 상세 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '환자 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/patients/[id]
 * 환자 정보 수정
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
    const { name, phone, birthDate } = body

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(birthDate !== undefined && { birthDate }),
      },
    })

    return NextResponse.json({ success: true, patient })
  } catch (error) {
    console.error('환자 정보 수정 오류:', error)
    return NextResponse.json(
      { success: false, error: '환자 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/patients/[id]
 * 환자 삭제
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

    // 예약이 있는지 확인
    const appointmentCount = await prisma.appointment.count({
      where: { patientId: id },
    })

    if (appointmentCount > 0) {
      return NextResponse.json(
        { success: false, error: `이 환자에게 ${appointmentCount}개의 예약이 있어 삭제할 수 없습니다.` },
        { status: 400 }
      )
    }

    await prisma.patient.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('환자 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '환자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




