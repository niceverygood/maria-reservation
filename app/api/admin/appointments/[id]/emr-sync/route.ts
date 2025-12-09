import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * POST /api/admin/appointments/[id]/emr-sync
 * EMR 등록 완료 처리
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        emrSynced: true,
        emrSyncedAt: new Date(),
        emrSyncedBy: admin.userId
      },
      include: {
        doctor: { select: { name: true } },
        patient: { select: { name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      appointment,
      message: 'EMR 등록 완료 처리되었습니다.'
    })
  } catch (error) {
    console.error('EMR 등록 처리 오류:', error)
    return NextResponse.json({ success: false, error: 'EMR 등록 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/appointments/[id]/emr-sync
 * EMR 등록 취소 처리 (실수로 눌렀을 때)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        emrSynced: false,
        emrSyncedAt: null,
        emrSyncedBy: null
      }
    })

    return NextResponse.json({
      success: true,
      appointment,
      message: 'EMR 등록이 취소되었습니다.'
    })
  } catch (error) {
    console.error('EMR 등록 취소 오류:', error)
    return NextResponse.json({ success: false, error: 'EMR 등록 취소 중 오류가 발생했습니다.' }, { status: 500 })
  }
}




