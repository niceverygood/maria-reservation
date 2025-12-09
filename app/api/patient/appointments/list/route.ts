import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/patient/appointments/list
 * 환자용 - 본인의 예약 목록 조회
 * 
 * Request Body:
 * {
 *   name: string,
 *   birthDate: string (YYYYMMDD),
 *   phone: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   appointments: [{ id, doctorName, department, date, time, status }, ...]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, birthDate, phone } = body

    // 유효성 검사
    if (!name || !birthDate || !phone) {
      return NextResponse.json(
        { success: false, error: '이름, 생년월일, 전화번호를 모두 입력해주세요.' },
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
      // 환자를 찾을 수 없어도 빈 배열 반환 (보안상 환자 존재 여부를 노출하지 않음)
      return NextResponse.json({
        success: true,
        appointments: [],
      })
    }

    // 오늘 날짜
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayString = today.toISOString().split('T')[0]

    // 미래 예약만 조회 (오늘 포함)
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        date: {
          gte: todayString,
        },
        status: {
          in: ['BOOKED', 'COMPLETED'], // 취소되지 않은 예약만
        },
      },
      include: {
        doctor: {
          select: {
            name: true,
            department: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      appointments: appointments.map((apt) => ({
        id: apt.id,
        doctorName: apt.doctor.name,
        department: apt.doctor.department,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        reservedAt: apt.reservedAt,
      })),
    })
  } catch (error) {
    console.error('예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





