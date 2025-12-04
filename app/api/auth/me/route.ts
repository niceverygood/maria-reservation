import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentPatient } from '@/lib/patientAuth'

/**
 * GET /api/auth/me
 * 현재 로그인한 환자 정보 조회
 */
export async function GET() {
  try {
    const patientPayload = await getCurrentPatient()

    if (!patientPayload) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientPayload.patientId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phone: true,
        kakaoId: true,
        kakaoEmail: true,
        kakaoProfile: true,
      },
    })

    if (!patient) {
      return NextResponse.json(
        { success: false, error: '환자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      patient,
      isProfileComplete: !!(patient.birthDate && patient.phone),
    })
  } catch (error) {
    console.error('환자 정보 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

