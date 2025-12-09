import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { verifyPatientToken } from '@/lib/patientAuth'

/**
 * GET /api/patient/appointments/updates
 * 환자의 예약 상태 변경 확인 (실시간 동기화용)
 */
export async function GET(request: Request) {
  try {
    // 로그인 확인
    const cookieStore = await cookies()
    const token = cookieStore.get('patient-token')?.value

    if (!token) {
      return NextResponse.json({ success: true, hasUpdates: false, checkedAt: new Date().toISOString() })
    }

    const payload = await verifyPatientToken(token)
    if (!payload) {
      return NextResponse.json({ success: true, hasUpdates: false, checkedAt: new Date().toISOString() })
    }

    const { searchParams } = new URL(request.url)
    const minutes = parseInt(searchParams.get('minutes') || '1')
    const lastChecked = searchParams.get('lastChecked')

    const sinceTime = lastChecked 
      ? new Date(lastChecked)
      : new Date(Date.now() - minutes * 60 * 1000)

    // 환자의 예약 중 상태가 변경된 것이 있는지 확인
    const updatedAppointments = await prisma.appointment.findMany({
      where: {
        patientId: payload.patientId,
        updatedAt: { gt: sinceTime },
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
      take: 10,
    })

    const hasUpdates = updatedAppointments.length > 0

    return NextResponse.json({
      success: true,
      hasUpdates,
      updateCount: updatedAppointments.length,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('예약 상태 확인 오류:', error)
    return NextResponse.json({
      success: true,
      hasUpdates: false,
      checkedAt: new Date().toISOString(),
    })
  }
}




