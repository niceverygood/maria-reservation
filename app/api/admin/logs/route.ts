import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientName = searchParams.get('patientName')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // 환자 이름 검색
    if (patientName && patientName.trim()) {
      where.patient = {
        name: {
          contains: patientName.trim(),
        },
      }
    }

    // 상태 필터
    if (status) {
      where.status = status
    }

    // 날짜 범위 필터
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = startDate
      }
      if (endDate) {
        where.date.lte = endDate
      }
    }

    // 전체 개수 조회
    const totalCount = await prisma.appointment.count({ where })

    // 로그 조회 (최신순)
    const logs = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            birthDate: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { reservedAt: 'desc' },
      ],
      skip,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('예약 로그 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '예약 로그를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




