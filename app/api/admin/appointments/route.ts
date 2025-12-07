import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { isSlotAvailable } from '@/lib/reservation/slotCalculator'

/**
 * GET /api/admin/appointments
 * 관리자용 - 예약 목록 조회
 * 
 * Query Parameters:
 * - date: 특정 날짜 (YYYY-MM-DD)
 * - doctorId: 의사 ID
 * - status: 예약 상태
 * - search: 환자명 또는 전화번호 검색
 */
export async function GET(request: Request) {
  try {
    // 인증 확인
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const doctorId = searchParams.get('doctorId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // 조건 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (date) {
      where.date = date
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.patient = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            phone: true,
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
      appointments,
      total: appointments.length,
    })
  } catch (error) {
    console.error('예약 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/appointments
 * 관리자용 - 예약 생성 (전화 예약 대행)
 */
export async function POST(request: Request) {
  try {
    // 인증 확인
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, birthDate, phone, doctorId, date, time, memo } = body

    // 유효성 검사
    if (!name || !birthDate || !phone || !doctorId || !date || !time) {
      return NextResponse.json(
        { success: false, error: '모든 필수 필드를 입력해주세요.' },
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

    // 예약 생성
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        date,
        time,
        status: 'BOOKED',
        memo: memo || null,
      },
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

    return NextResponse.json({
      success: true,
      appointment,
    })
  } catch (error) {
    console.error('예약 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


