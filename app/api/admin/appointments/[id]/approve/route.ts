import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastStatusUpdate } from '@/lib/ws/serverClient'
import { sendReservationApprovedKakao } from '@/lib/notification/kakaoAlimtalk'

// 지점명 및 환자 웹 URL (환경변수로 설정 가능)
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

/**
 * POST /api/admin/appointments/[id]/approve
 * 관리자용 - 예약 승인 (PENDING -> BOOKED)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id: appointmentId } = await params

    // 예약 조회
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor: { select: { name: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (appointment.status !== 'PENDING') {
      return NextResponse.json({ 
        success: false, 
        error: `대기 중인 예약만 승인할 수 있습니다. (현재 상태: ${appointment.status})` 
      }, { status: 400 })
    }

    // 예약 승인
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'BOOKED' },
    })

    // WebSocket 브로드캐스트 (비동기)
    broadcastStatusUpdate({
      id: appointmentId,
      status: 'BOOKED',
      date: updated.date,
      doctorId: updated.doctorId,
    }).catch(console.error)

    // 카카오 알림톡 발송 - 예약 확정 알림 (비동기, 실패해도 API 응답에 영향 없음)
    try {
      if (appointment.patient.phone) {
        sendReservationApprovedKakao({
          phone: appointment.patient.phone,
          name: appointment.patient.name,
          date: updated.date,
          time: updated.time,
          doctorName: appointment.doctor.name,
          branchName: BRANCH_NAME,
          link: `${PATIENT_WEB_URL}/mypage`,
        }).catch((err) => {
          console.error('[알림톡] 예약 확정 알림 발송 실패:', err)
        })
      }
    } catch (alimtalkError) {
      // 알림톡 실패해도 승인 응답은 정상 반환
      console.error('[알림톡] 예약 확정 알림 발송 중 오류:', alimtalkError)
    }

    return NextResponse.json({
      success: true,
      message: '예약이 확정되었습니다.',
      appointment: {
        id: updated.id,
        status: updated.status,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        date: updated.date,
        time: updated.time,
      },
    })
  } catch (error) {
    console.error('예약 승인 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 승인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
