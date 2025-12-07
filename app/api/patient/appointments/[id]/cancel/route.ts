import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPatientToken } from '@/lib/patientAuth'
import prisma from '@/lib/db'
import { broadcastCancelAppointment } from '@/lib/ws/serverClient'
import { sendReservationCancelKakao } from '@/lib/notification/kakaoAlimtalk'

// 지점명 및 환자 웹 URL (환경변수로 설정 가능)
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

/**
 * POST /api/patient/appointments/[id]/cancel
 * 환자용 - 예약 취소 (최적화 버전)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params

    // 로그인 확인
    const cookieStore = await cookies()
    const token = cookieStore.get('patient-token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const payload = await verifyPatientToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: '인증이 만료되었습니다.' }, { status: 401 })
    }

    // 예약 조회 (환자 정보 및 의사 정보 포함)
    const appointment = await prisma.appointment.findFirst({
      where: { 
        id: appointmentId,
        patientId: payload.patientId,
        status: { in: ['PENDING', 'BOOKED'] }
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true }
        },
        doctor: {
          select: { id: true, name: true }
        }
      }
    })

    if (!appointment) {
      // 이미 취소되었거나 없는 경우 - 성공으로 처리 (UI에서 조용히 새로고침)
      return NextResponse.json({ success: true, message: '이미 처리된 예약입니다.', alreadyProcessed: true })
    }

    // 과거 날짜 체크
    const today = new Date().toISOString().split('T')[0]
    if (appointment.date < today) {
      return NextResponse.json({ success: false, error: '지난 예약은 취소할 수 없습니다.' }, { status: 400 })
    }

    // 예약 취소
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    })

    // WebSocket 브로드캐스트 (비동기, 실패해도 API 응답에 영향 없음)
    broadcastCancelAppointment({
      id: appointmentId,
      doctorId: appointment.doctor.id,
      date: appointment.date,
      time: appointment.time,
    }).catch(console.error)

    // 카카오 알림톡 발송 (비동기, 실패해도 API 응답에 영향 없음)
    try {
      if (appointment.patient.phone) {
        sendReservationCancelKakao({
          phone: appointment.patient.phone,
          name: appointment.patient.name,
          date: appointment.date,
          time: appointment.time,
          doctorName: appointment.doctor.name,
          branchName: BRANCH_NAME,
          link: `${PATIENT_WEB_URL}/reserve`,
        }).catch((err) => {
          console.error('[알림톡] 예약 취소 알림 발송 실패:', err)
        })
      }
    } catch (alimtalkError) {
      // 알림톡 실패해도 취소 응답은 정상 반환
      console.error('[알림톡] 예약 취소 알림 발송 중 오류:', alimtalkError)
    }

    return NextResponse.json({ success: true, message: '예약이 취소되었습니다.' })
  } catch (error) {
    console.error('예약 취소 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
