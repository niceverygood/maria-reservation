import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentPatient } from '@/lib/patientAuth'

/**
 * POST /api/auth/complete-profile
 * 카카오 로그인 후 추가 정보 (생년월일, 전화번호) 입력
 */
export async function POST(request: Request) {
  try {
    const patientPayload = await getCurrentPatient()

    if (!patientPayload) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { birthDate, phone } = body

    // 유효성 검사
    if (!birthDate || !phone) {
      return NextResponse.json(
        { success: false, error: '생년월일과 전화번호를 모두 입력해주세요.' },
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

    // 환자 정보 업데이트
    const patient = await prisma.patient.update({
      where: { id: patientPayload.patientId },
      data: { birthDate, phone },
    })

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        birthDate: patient.birthDate,
        phone: patient.phone,
      },
    })
  } catch (error) {
    console.error('프로필 완성 오류:', error)
    return NextResponse.json(
      { success: false, error: '정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


