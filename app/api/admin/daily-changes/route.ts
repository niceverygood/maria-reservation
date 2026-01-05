import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/daily-changes
 * 특정 날짜의 예약 변경사항 조회 (확정/변경/취소)
 * EMR 입력용으로 사용
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    // 날짜가 없으면 어제 날짜 사용
    const targetDate = dateParam || getYesterdayDate()
    
    // 해당 날짜에 변경된 예약들 조회
    // 1. 해당 날짜에 생성된 새 예약 (확정)
    // 2. 해당 날짜에 변경된 예약 (변경)
    // 3. 해당 날짜에 취소된 예약 (취소)
    
    const startOfDay = new Date(`${targetDate}T00:00:00+09:00`)
    const endOfDay = new Date(`${targetDate}T23:59:59+09:00`)

    // 새 예약 (해당 날짜에 생성된 예약)
    const newAppointments = await prisma.appointment.findMany({
      where: {
        reservedAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['BOOKED', 'PENDING']
        },
        changeCount: 0 // 변경되지 않은 새 예약
      },
      include: {
        doctor: { select: { id: true, name: true, department: true } },
        patient: { select: { id: true, name: true, birthDate: true, phone: true } }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    })

    // 변경된 예약 (해당 날짜에 변경됨)
    const changedAppointments = await prisma.appointment.findMany({
      where: {
        lastChangedAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        changeCount: {
          gt: 0
        },
        status: {
          in: ['BOOKED', 'PENDING']
        }
      },
      include: {
        doctor: { select: { id: true, name: true, department: true } },
        patient: { select: { id: true, name: true, birthDate: true, phone: true } }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    })

    // 취소된 예약 (해당 날짜에 취소됨)
    const cancelledAppointments = await prisma.appointment.findMany({
      where: {
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'CANCELLED'
      },
      include: {
        doctor: { select: { id: true, name: true, department: true } },
        patient: { select: { id: true, name: true, birthDate: true, phone: true } }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    })

    // EMR 미등록 예약도 함께 조회 (해당 날짜 이전에 확정된 예약 중 EMR 미등록)
    const unsynced = await prisma.appointment.findMany({
      where: {
        emrSynced: false,
        status: {
          in: ['BOOKED', 'PENDING', 'COMPLETED']
        },
        reservedAt: {
          lt: startOfDay
        }
      },
      include: {
        doctor: { select: { id: true, name: true, department: true } },
        patient: { select: { id: true, name: true, birthDate: true, phone: true } }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      date: targetDate,
      summary: {
        newCount: newAppointments.length,
        changedCount: changedAppointments.length,
        cancelledCount: cancelledAppointments.length,
        unsyncedCount: unsynced.length
      },
      newAppointments,
      changedAppointments,
      cancelledAppointments,
      unsyncedAppointments: unsynced
    })
  } catch (error) {
    console.error('일일 변경사항 조회 오류:', error)
    return NextResponse.json({ success: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

