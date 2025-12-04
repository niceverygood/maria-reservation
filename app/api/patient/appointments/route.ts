import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isSlotAvailable } from '@/lib/reservation/slotCalculator'

/**
 * POST /api/patient/appointments
 * 환자용 - 예약 생성
 * 
 * Request Body:
 * {
 *   name: string,
 *   birthDate: string (YYYYMMDD),
 *   phone: string,
 *   doctorId: string,
 *   date: string (YYYY-MM-DD),
 *   time: string (HH:MM)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   appointment: { id, doctorName, date, time, status }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, birthDate, phone, doctorId, date, time } = body

    // 유효성 검사
    if (!name || !birthDate || !phone || !doctorId || !date || !time) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 이름 검사 (2자 이상)
    if (name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: '이름은 2자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 생년월일 형식 검사 (YYYYMMDD)
    const birthDateRegex = /^\d{8}$/
    if (!birthDateRegex.test(birthDate)) {
      return NextResponse.json(
        { success: false, error: '생년월일 형식이 올바르지 않습니다. (YYYYMMDD)' },
        { status: 400 }
      )
    }

    // 전화번호 형식 검사 (10~11자리 숫자)
    const phoneRegex = /^\d{10,11}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: '전화번호 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // 날짜 형식 검사 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // 시간 형식 검사 (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(time)) {
      return NextResponse.json(
        { success: false, error: '시간 형식이 올바르지 않습니다. (HH:MM)' },
        { status: 400 }
      )
    }

    // 의사 존재 여부 확인
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    })

    if (!doctor || !doctor.isActive) {
      return NextResponse.json(
        { success: false, error: '존재하지 않거나 진료하지 않는 의사입니다.' },
        { status: 400 }
      )
    }

    // 슬롯 가용 여부 확인
    const available = await isSlotAvailable(doctorId, date, time)
    if (!available) {
      return NextResponse.json(
        { success: false, error: '선택하신 시간은 이미 예약되었거나 예약할 수 없는 시간입니다.' },
        { status: 400 }
      )
    }

    // 환자 조회 또는 생성
    let patient = await prisma.patient.findUnique({
      where: {
        name_birthDate_phone: {
          name: name.trim(),
          birthDate,
          phone,
        },
      },
    })

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: name.trim(),
          birthDate,
          phone,
        },
      })
    }

    // 동일 환자의 같은 날짜 중복 예약 체크
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        date,
        status: 'BOOKED',
      },
    })

    if (existingAppointment) {
      return NextResponse.json(
        { success: false, error: '같은 날짜에 이미 예약이 있습니다.' },
        { status: 400 }
      )
    }

    // 예약 생성
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        date,
        time,
        status: 'BOOKED',
      },
      include: {
        doctor: {
          select: {
            name: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        doctorName: appointment.doctor.name,
        department: appointment.doctor.department,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        reservedAt: appointment.reservedAt,
      },
    })
  } catch (error) {
    console.error('예약 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

