import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/patient/doctors
 * 환자용 - 활성화된 의사 목록 조회
 * 
 * Query Parameters:
 * - department: (선택) 진료과 필터
 * 
 * Response:
 * {
 *   doctors: [{ id, name, department }],
 *   departments: ["산부인과", "내과", ...]
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')

    // 활성화된 의사 목록 조회
    const doctors = await prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(department ? { department } : {}),
      },
      select: {
        id: true,
        name: true,
        department: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // 진료과 목록 추출 (중복 제거)
    const allDoctors = await prisma.doctor.findMany({
      where: { isActive: true },
      select: { department: true },
      distinct: ['department'],
    })
    const departments = allDoctors.map((d) => d.department)

    return NextResponse.json({
      success: true,
      doctors,
      departments,
    })
  } catch (error) {
    console.error('의사 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '의사 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

