import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { broadcastStatusUpdate } from '@/lib/ws/serverClient'
import {
  sendReservationApprovedKakao,
  sendReservationCancelKakao,
  sendReservationRejectedKakao,
  sendStatusChangeKakao,
  isNotificationEnabled,
} from '@/lib/notification/kakaoAlimtalk'
import { invalidateSlotCache } from '@/lib/cache/slotCache'

// 지점명 및 환자 웹 URL
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

/**
 * PATCH /api/admin/appointments/[id]/status
 * 관리자용 - 예약 상태 변경 + 알림 발송
 * 
 * Request Body:
 * {
 *   status: 'BOOKED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'REJECTED'
 *   sendNotification?: boolean  // 알림 발송 여부 (기본값: true)
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
    const { status, sendNotification = true } = body

    // 유효성 검사
    const validStatuses = ['BOOKED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'REJECTED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      )
    }

    // 예약 존재 여부 확인 (환자/의사 정보 포함)
    const appointment = await prisma.appointment.findUnique({
      where: { id },
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

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const previousStatus = appointment.status

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

    // 🚀 캐시 무효화
    invalidateSlotCache(updatedAppointment.doctorId, updatedAppointment.date)

    // WebSocket 브로드캐스트 (비동기)
    broadcastStatusUpdate({
      id,
      status,
      date: updatedAppointment.date,
      doctorId: updatedAppointment.doctorId,
    }).catch(console.error)

    // 알림 발송 (비동기)
    if (sendNotification && isNotificationEnabled() && appointment.patient.phone) {
      const alimtalkParams = {
        phone: appointment.patient.phone,
        name: appointment.patient.name,
        date: appointment.date,
        time: appointment.time,
        doctorName: appointment.doctor.name,
        branchName: BRANCH_NAME,
        link: `${PATIENT_WEB_URL}/mypage`,
        appointmentId: id,
      }

      // 상태에 따라 다른 알림 발송
      if (previousStatus === 'PENDING' && status === 'BOOKED') {
        // 대기 → 확정: 승인 알림
        sendReservationApprovedKakao(alimtalkParams).catch(console.error)
      } else if (previousStatus === 'PENDING' && status === 'REJECTED') {
        // 대기 → 거절: 거절 알림
        sendReservationRejectedKakao(alimtalkParams).catch(console.error)
      } else if (status === 'CANCELLED') {
        // 취소 알림
        sendReservationCancelKakao(alimtalkParams).catch(console.error)
      } else if (status === 'COMPLETED' || status === 'NO_SHOW') {
        // 완료/노쇼 상태 변경 알림 (선택적)
        // 기본적으로 완료/노쇼는 알림 안 보냄 (원하면 활성화)
        // sendStatusChangeKakao(alimtalkParams, status).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      notificationSent: sendNotification && isNotificationEnabled(),
    })
  } catch (error) {
    console.error('예약 상태 변경 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
