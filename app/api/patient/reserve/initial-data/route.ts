import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { verifyPatientToken } from '@/lib/patientAuth'

/**
 * GET /api/patient/reserve/initial-data
 * 예약 페이지 진입 시 필요한 모든 초기 데이터를 한 번에 반환
 * 
 * Response:
 * - doctors: 활성 의사 목록
 * - patient: 로그인된 환자 정보 (있으면)
 * - isLoggedIn: 로그인 여부
 * - dateRange: 예약 가능 날짜 범위
 * - settings: 병원 설정
 */
export async function GET() {
  try {
    // 인증 확인 (병렬로 실행)
    const cookieStore = await cookies()
    const token = cookieStore.get('patient-token')?.value
    
    // 모든 데이터를 병렬로 조회
    const [doctors, patientData] = await Promise.all([
      // 활성 의사 목록
      prisma.doctor.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          department: true,
          position: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      // 환자 인증
      (async () => {
        if (!token) return null
        const payload = await verifyPatientToken(token)
        if (!payload) return null
        
        const patient = await prisma.patient.findUnique({
          where: { id: payload.patientId },
          select: {
            id: true,
            name: true,
            birthDate: true,
            phone: true,
            kakaoId: true,
          },
        })
        return patient
      })(),
    ])

    // 예약 가능 날짜 범위 계산
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minDate = today.toISOString().split('T')[0]
    
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 28) // 4주 후
    const maxDateStr = maxDate.toISOString().split('T')[0]

    return NextResponse.json({
      success: true,
      doctors,
      patient: patientData,
      isLoggedIn: !!patientData,
      dateRange: {
        minDate,
        maxDate: maxDateStr,
      },
      settings: {
        slotIntervalMinutes: 15,
        minAdvanceMinutes: 120, // 최소 2시간 전 예약
        maxAdvanceDays: 28,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60', // 1분 캐시
      },
    })
  } catch (error) {
    console.error('초기 데이터 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

