import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { invalidateSlotCache } from '@/lib/cache/slotCache'
import { updateSlotSummary } from '@/lib/slots/precompute'

/**
 * POST /api/patient/appointments/cancel
 * 환자용 - 예약 취소
 * 
 * Request Body:
 * {
 *   appointmentId: string,
 *   name: string,
 *   birthDate: string (YYYYMMDD),
 *   phone: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "예약이 취소되었습니다."
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, name, birthDate, phone } = body

    // 유효성 검사
    if (!appointmentId || !name || !birthDate || !phone) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 환자 조회
    const patient = await prisma.patient.findUnique({
      where: {
        name_birthDate_phone: {
          name: name.trim(),
          birthDate,
          phone,
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { success: false, error: '본인 확인에 실패했습니다.' },
        { status: 400 }
      )
    }

    // 예약 조회
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: {
            name: true,
            department: true,
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

    // 본인 확인
    if (appointment.patientId !== patient.id) {
      return NextResponse.json(
        { success: false, error: '본인의 예약만 취소할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 이미 취소된 예약인지 확인
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: '이미 취소된 예약입니다.' },
        { status: 400 }
      )
    }

    // 이미 완료된 예약인지 확인
    if (appointment.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: '이미 방문 완료된 예약은 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 과거 예약인지 확인
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayString = today.toISOString().split('T')[0]
    
    if (appointment.date < todayString) {
      return NextResponse.json(
        { success: false, error: '지난 예약은 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 당일 예약 취소 제한 (옵션: 필요시 활성화)
    // if (appointment.date === todayString) {
    //   return NextResponse.json(
    //     { success: false, error: '당일 예약은 전화로 취소해주세요.' },
    //     { status: 400 }
    //   )
    // }

    // 예약 취소
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    })

    // 🚀 캐시 무효화
    invalidateSlotCache(appointment.doctorId, appointment.date)
    
    // 🚀 슬롯 요약 갱신 (비동기)
    updateSlotSummary(appointment.doctorId, appointment.date).catch(console.error)

    return NextResponse.json({
      success: true,
      message: '예약이 취소되었습니다.',
      cancelledAppointment: {
        id: appointment.id,
        doctorName: appointment.doctor.name,
        department: appointment.doctor.department,
        date: appointment.date,
        time: appointment.time,
      },
    })
  } catch (error) {
    console.error('예약 취소 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


