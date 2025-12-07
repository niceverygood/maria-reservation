import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { verifyPatientToken } from '@/lib/patientAuth'
import { broadcastNewAppointment, broadcastReschedule } from '@/lib/ws/serverClient'
import { sendReservationConfirmKakao } from '@/lib/notification/kakaoAlimtalk'
import { invalidateSlotCache } from '@/lib/cache/slotCache'
import { updateSlotSummary } from '@/lib/slots/precompute'

// 지점명 및 환자 웹 URL (환경변수로 설정 가능)
const BRANCH_NAME = process.env.BRANCH_NAME || '일산마리아병원'
const PATIENT_WEB_URL = process.env.NEXT_PUBLIC_PATIENT_URL || 'https://maria-reservation.vercel.app'

/**
 * POST /api/patient/appointments
 * 환자용 - 예약 생성 (최적화 버전)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, birthDate, phone, doctorId, date, time, rescheduleId } = body

    // 유효성 검사 (동기 처리 - 빠름)
    if (!name || !birthDate || !phone || !doctorId || !date || !time) {
      return NextResponse.json({ success: false, error: '모든 필드를 입력해주세요.' }, { status: 400 })
    }
    if (name.trim().length < 2) {
      return NextResponse.json({ success: false, error: '이름은 2자 이상이어야 합니다.' }, { status: 400 })
    }
    if (!/^\d{8}$/.test(birthDate)) {
      return NextResponse.json({ success: false, error: '생년월일 형식이 올바르지 않습니다. (YYYYMMDD)' }, { status: 400 })
    }
    if (!/^\d{10,11}$/.test(phone)) {
      return NextResponse.json({ success: false, error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ success: false, error: '시간 형식이 올바르지 않습니다. (HH:MM)' }, { status: 400 })
    }

    // 토큰 확인 (쿠키 읽기)
    const cookieStore = await cookies()
    const token = cookieStore.get('patient-token')?.value
    let patientId: string | null = null

    if (token) {
      const payload = await verifyPatientToken(token)
      if (payload) {
        patientId = payload.patientId
      }
    }

    // 1단계: 필수 검증을 병렬로 실행 (의사 확인 + 슬롯 중복 체크)
    const [doctor, existingSlot] = await Promise.all([
      // 의사 존재 여부
      prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, name: true, department: true, isActive: true },
      }),
      // 해당 시간대에 이미 예약이 있는지 확인 (PENDING, BOOKED)
      prisma.appointment.findFirst({
        where: {
          doctorId,
          date,
          time,
          status: { in: ['PENDING', 'BOOKED'] },
          ...(rescheduleId ? { id: { not: rescheduleId } } : {}),
        },
        select: { id: true },
      }),
    ])

    if (!doctor || !doctor.isActive) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 진료하지 않는 의사입니다.' }, { status: 400 })
    }

    if (existingSlot) {
      return NextResponse.json({ success: false, error: '선택하신 시간은 이미 예약되었습니다.' }, { status: 400 })
    }

    // 2단계: 환자 처리 (upsert로 간소화)
    let patient
    if (patientId) {
      // 로그인된 환자 - 정보 업데이트
      patient = await prisma.patient.update({
        where: { id: patientId },
        data: { name: name.trim(), birthDate, phone },
      })
    } else {
      // 비로그인 - 기존 환자 찾거나 생성
      patient = await prisma.patient.findFirst({
        where: { name: name.trim(), phone },
      })

      if (patient) {
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: { birthDate: birthDate || patient.birthDate },
        })
      } else {
        patient = await prisma.patient.create({
          data: { name: name.trim(), birthDate, phone },
        })
      }
    }

    // 3단계: 예약 변경인 경우 기존 예약 취소
    if (rescheduleId) {
      await prisma.appointment.updateMany({
        where: { id: rescheduleId, status: { in: ['PENDING', 'BOOKED'] } },
        data: { status: 'CANCELLED' },
      })
    }

    // 4단계: 동일 환자 동일 날짜 중복 체크
    const duplicate = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        date,
        status: { in: ['PENDING', 'BOOKED'] },
        ...(rescheduleId ? { id: { not: rescheduleId } } : {}),
      },
      select: { id: true, status: true },
    })

    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: `같은 날짜에 이미 ${duplicate.status === 'PENDING' ? '승인 대기 중인' : '확정된'} 예약이 있습니다.`,
      }, { status: 400 })
    }

    // 5단계: 새 예약 생성
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        date,
        time,
        status: 'PENDING',
      },
    })

    // 🚀 캐시 무효화 (즉시 실행)
    invalidateSlotCache(doctorId, date)
    
    // 🚀 슬롯 요약 갱신 (비동기 - 응답 대기 안함)
    updateSlotSummary(doctorId, date).catch(console.error)

    // 6단계: 비동기 작업들 (응답 후 처리 - 사용자 대기 없음)
    // WebSocket 브로드캐스트
    if (rescheduleId) {
      broadcastReschedule({
        oldId: rescheduleId,
        newId: appointment.id,
        doctorId,
        date,
        time,
        patientName: patient.name,
      }).catch(() => {})
    } else {
      broadcastNewAppointment({
        id: appointment.id,
        doctorId,
        date,
        time,
        patientName: patient.name,
        doctorName: doctor.name,
        department: doctor.department,
        status: appointment.status,
      }).catch(() => {})
    }

    // 알림톡 발송 (완전 비동기)
    if (patient.phone) {
      sendReservationConfirmKakao({
        phone: patient.phone,
        name: patient.name,
        date: appointment.date,
        time: appointment.time,
        doctorName: doctor.name,
        branchName: BRANCH_NAME,
        link: `${PATIENT_WEB_URL}/mypage`,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        doctorName: doctor.name,
        department: doctor.department,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        reservedAt: appointment.reservedAt,
      },
    })
  } catch (error) {
    console.error('예약 생성 오류:', error)
    const message = error instanceof Error ? error.message : '예약 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
