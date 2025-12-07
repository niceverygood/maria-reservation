import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * GET /api/doctor/change-requests
 * 의사 본인의 변경 요청 목록 조회
 */
export async function GET() {
  try {
    const user = await getCurrentAdmin()
    if (!user || user.role !== 'DOCTOR' || !user.doctorId) {
      return NextResponse.json({ success: false, error: '의사 계정으로 로그인해주세요.' }, { status: 401 })
    }

    const requests = await prisma.scheduleChangeRequest.findMany({
      where: { doctorId: user.doctorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, requests })
  } catch (error) {
    console.error('변경 요청 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/doctor/change-requests
 * 변경 요청 생성
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentAdmin()
    if (!user || user.role !== 'DOCTOR' || !user.doctorId) {
      return NextResponse.json({ success: false, error: '의사 계정으로 로그인해주세요.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      requestType,      // RESCHEDULE, CANCEL, OFF_DAY
      appointmentId,
      originalDate,
      originalTime,
      newDate,
      newTime,
      offDate,
      offReason,
      reason,
    } = body

    // 유효성 검사
    if (!requestType) {
      return NextResponse.json({ success: false, error: '요청 유형을 선택해주세요.' }, { status: 400 })
    }

    if (requestType === 'RESCHEDULE' && (!originalDate || !newDate)) {
      return NextResponse.json({ success: false, error: '기존 날짜와 변경할 날짜를 입력해주세요.' }, { status: 400 })
    }

    if (requestType === 'OFF_DAY' && !offDate) {
      return NextResponse.json({ success: false, error: '휴진 날짜를 입력해주세요.' }, { status: 400 })
    }

    // 예약 변경/취소 요청인 경우 예약 확인
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      })

      if (!appointment) {
        return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
      }

      if (appointment.doctorId !== user.doctorId) {
        return NextResponse.json({ success: false, error: '본인의 예약만 변경 요청할 수 있습니다.' }, { status: 403 })
      }
    }

    // 변경 요청 생성
    const changeRequest = await prisma.scheduleChangeRequest.create({
      data: {
        id: randomUUID(),
        doctorId: user.doctorId,
        requestType,
        appointmentId,
        originalDate,
        originalTime,
        newDate,
        newTime,
        offDate,
        offReason,
        reason,
        status: 'PENDING',
      },
    })

    // 관리자에게 알림 생성
    await prisma.adminNotification.create({
      data: {
        type: 'CHANGE_REQUEST',
        title: requestType === 'OFF_DAY' ? '휴진 요청' : 
               requestType === 'CANCEL' ? '예약 취소 요청' : '예약 변경 요청',
        message: `${user.name} 선생님이 ${
          requestType === 'OFF_DAY' ? `${offDate} 휴진을` :
          requestType === 'CANCEL' ? `${originalDate} ${originalTime} 예약 취소를` :
          `${originalDate} ${originalTime} → ${newDate} ${newTime} 변경을`
        } 요청했습니다.`,
        appointmentId: appointmentId || null,
      },
    })

    return NextResponse.json({ success: true, changeRequest })
  } catch (error) {
    console.error('변경 요청 생성 오류:', error)
    return NextResponse.json({ success: false, error: '변경 요청 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
