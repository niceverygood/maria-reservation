import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * GET /api/admin/appointments/new
 * 최근 N분 내 새 예약 및 변경된 예약 조회 (실시간 알림용)
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const minutes = parseInt(searchParams.get('minutes') || '5')
    const lastChecked = searchParams.get('lastChecked') // ISO timestamp

    const sinceTime = lastChecked 
      ? new Date(lastChecked)
      : new Date(Date.now() - minutes * 60 * 1000)

    // 새 예약 조회 (PENDING 상태 포함)
    const newAppointments = await prisma.appointment.findMany({
      where: {
        reservedAt: { gt: sinceTime },
        status: { in: ['PENDING', 'BOOKED'] },
      },
      include: {
        doctor: { select: { name: true, department: true } },
        patient: { select: { name: true, phone: true } },
      },
      orderBy: { reservedAt: 'desc' },
      take: 20,
    })

    // 업데이트된 예약 조회 (취소, 변경 등)
    const updatedAppointments = await prisma.appointment.findMany({
      where: {
        updatedAt: { gt: sinceTime },
        reservedAt: { lte: sinceTime }, // 새 예약이 아닌 것만
      },
      include: {
        doctor: { select: { name: true, department: true } },
        patient: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    // 변경 사항 있으면 hasChanges true
    const hasChanges = updatedAppointments.length > 0

    return NextResponse.json({
      success: true,
      appointments: newAppointments.map(apt => ({
        id: apt.id,
        patientName: apt.patient.name,
        patientPhone: apt.patient.phone,
        doctorName: apt.doctor.name,
        department: apt.doctor.department,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        reservedAt: apt.reservedAt.toISOString(),
      })),
      count: newAppointments.length,
      hasChanges, // 기존 예약에 변경사항이 있는지
      updatedCount: updatedAppointments.length,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('새 예약 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '새 예약을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

