import { NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/reservation/slotCalculator'
import prisma from '@/lib/db'

/**
 * POST /api/patient/appointments/available-slots
 * 환자용 - 특정 의사, 특정 날짜의 예약 가능 슬롯 조회
 * 
 * Request Body:
 * {
 *   doctorId: string,
 *   date: string (YYYY-MM-DD)
 * }
 * 
 * Response:
 * {
 *   slots: [{ time: "09:00", available: true }, ...]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { doctorId, date } = body

    // 유효성 검사
    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: 'doctorId와 date는 필수입니다.' },
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

    // 의사 존재 여부 확인
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true, department: true, isActive: true },
    })

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 의사입니다.' },
        { status: 404 }
      )
    }

    if (!doctor.isActive) {
      return NextResponse.json(
        { success: false, error: '현재 진료하지 않는 의사입니다.' },
        { status: 400 }
      )
    }

    // 예약 가능 범위 확인 (오늘 ~ 4주 후)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 28) // 4주 후

    const requestDate = new Date(date)
    if (requestDate < today) {
      return NextResponse.json(
        { success: false, error: '과거 날짜는 예약할 수 없습니다.' },
        { status: 400 }
      )
    }

    if (requestDate > maxDate) {
      return NextResponse.json(
        { success: false, error: '4주 이후의 날짜는 예약할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 예약 가능 슬롯 계산
    const slots = await getAvailableSlots(doctorId, date)

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        department: doctor.department,
      },
      date,
      slots,
      availableCount: slots.filter((s) => s.available).length,
      totalCount: slots.length,
    })
  } catch (error) {
    console.error('예약 가능 슬롯 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 가능 시간을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

