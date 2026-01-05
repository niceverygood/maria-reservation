import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/schedule-config
 * 전체 의사의 시간대별 예약 설정 조회
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const dayOfWeek = searchParams.get('dayOfWeek')

    // 모든 의사 조회 (활성화된 의사만, sortOrder 순)
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        department: true,
        maxPatientsPerSlot: true,
      }
    })

    // 시간대별 설정 조회
    const whereClause: { doctorId?: string; dayOfWeek?: number; isActive: boolean } = {
      isActive: true
    }
    
    if (doctorId) {
      whereClause.doctorId = doctorId
    }
    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      whereClause.dayOfWeek = parseInt(dayOfWeek)
    }

    const configs = await prisma.timeSlotConfig.findMany({
      where: whereClause,
      orderBy: [
        { doctorId: 'asc' },
        { dayOfWeek: 'asc' },
        { time: 'asc' }
      ]
    })

    // 스케줄 템플릿도 함께 조회 (기본 근무 시간)
    const scheduleTemplates = await prisma.scheduleTemplate.findMany({
      where: { isActive: true },
      orderBy: [
        { doctorId: 'asc' },
        { dayOfWeek: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      doctors,
      configs,
      scheduleTemplates
    })
  } catch (error) {
    console.error('스케줄 설정 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/admin/schedule-config
 * 시간대별 예약 설정 저장 (bulk upsert)
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body as {
      configs: Array<{
        doctorId: string
        dayOfWeek: number
        time: string
        slotType: 'AVAILABLE' | 'PROCEDURE' | 'OFF'
        maxPatients: number
      }>
    }

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json({ success: false, error: '설정 데이터가 필요합니다.' }, { status: 400 })
    }

    // 트랜잭션으로 bulk upsert
    const results = await prisma.$transaction(
      configs.map(config => 
        prisma.timeSlotConfig.upsert({
          where: {
            doctorId_dayOfWeek_time: {
              doctorId: config.doctorId,
              dayOfWeek: config.dayOfWeek,
              time: config.time
            }
          },
          update: {
            slotType: config.slotType,
            maxPatients: config.maxPatients,
            isActive: true
          },
          create: {
            doctorId: config.doctorId,
            dayOfWeek: config.dayOfWeek,
            time: config.time,
            slotType: config.slotType,
            maxPatients: config.maxPatients
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `${results.length}개의 설정이 저장되었습니다.`,
      count: results.length
    })
  } catch (error) {
    console.error('스케줄 설정 저장 오류:', error)
    return NextResponse.json({ success: false, error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/schedule-config
 * 특정 의사의 특정 요일 설정 초기화
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const dayOfWeek = searchParams.get('dayOfWeek')

    if (!doctorId) {
      return NextResponse.json({ success: false, error: '의사 ID가 필요합니다.' }, { status: 400 })
    }

    const whereClause: { doctorId: string; dayOfWeek?: number } = {
      doctorId
    }

    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      whereClause.dayOfWeek = parseInt(dayOfWeek)
    }

    const result = await prisma.timeSlotConfig.deleteMany({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 설정이 삭제되었습니다.`,
      count: result.count
    })
  } catch (error) {
    console.error('스케줄 설정 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

