import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { isSlotAvailable } from '@/lib/reservation/slotCalculator'

/**
 * GET /api/admin/appointments
 * 관리자용 - 예약 목록 조회 (최적화 버전)
 * 
 * Query Parameters:
 * - date: 특정 날짜 (YYYY-MM-DD) - 필수!
 * - doctorId: 의사 ID
 * - status: 예약 상태
 * - search: 환자명 또는 전화번호 검색
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 항목 수 (기본값: 50)
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // 최대 100개

    // 날짜가 없으면 오늘 날짜로 기본 설정 (전체 조회 방지)
    const today = new Date().toISOString().split('T')[0]
    const targetDate = date || today

    // 조건 구성
    const where: Record<string, unknown> = {
      date: targetDate,
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    if (status) {
      where.status = status
    }

    if (search && search.trim()) {
      where.patient = {
        OR: [
          { name: { contains: search.trim() } },
          { phone: { contains: search.trim() } },
        ],
      }
    }

    // 병렬로 총 개수와 데이터 조회
    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          memo: true,
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
        orderBy: { time: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    // 병렬로 의사 확인과 슬롯 확인
    const [doctor, available] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, name: true, department: true, isActive: true },
      }),
      isSlotAvailable(doctorId, date, time),
    ])

    if (!doctor || !doctor.isActive) {
      return NextResponse.json(
        { success: false, error: '존재하지 않거나 진료하지 않는 의사입니다.' },
        { status: 400 }
      )
    }

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
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
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
