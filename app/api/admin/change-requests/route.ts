import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/change-requests
 * 관리자용 - 모든 변경 요청 목록 조회
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, APPROVED, REJECTED, all
    const doctorId = searchParams.get('doctorId')

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (doctorId) {
      where.doctorId = doctorId
    }

    const requests = await prisma.scheduleChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // 의사 정보 조회
    const doctorIds = [...new Set(requests.map(r => r.doctorId))]
    const doctors = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true, department: true },
    })
    const doctorMap = new Map(doctors.map(d => [d.id, d]))

    // 예약 정보 조회
    const appointmentIds = requests.map(r => r.appointmentId).filter(Boolean) as string[]
    const appointments = await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      include: { patient: { select: { name: true, phone: true } } },
    })
    const appointmentMap = new Map(appointments.map(a => [a.id, a]))

    // 결과 조합
    const result = requests.map(r => ({
      ...r,
      doctor: doctorMap.get(r.doctorId),
      appointment: r.appointmentId ? appointmentMap.get(r.appointmentId) : null,
    }))

    return NextResponse.json({ success: true, requests: result })
  } catch (error) {
    console.error('변경 요청 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
