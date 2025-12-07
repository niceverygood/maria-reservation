import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

/**
 * GET /api/admin/notifications/settings
 * 알림 설정 조회
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const settings = await prisma.notificationSetting.findMany()
    
    // 기본값과 함께 반환
    const defaultSettings = {
      // 알림 활성화
      notification_enabled: 'true',
      
      // 예약 확정 알림
      confirm_enabled: 'true',
      
      // 예약 취소 알림
      cancel_enabled: 'true',
      
      // 예약 거절 알림
      reject_enabled: 'true',
      
      // 1일전 리마인더
      reminder_1day_enabled: 'true',
      reminder_1day_time: '18:00',
      
      // 당일 리마인더
      reminder_today_enabled: 'true',
      reminder_today_time: '08:00',
    }
    
    // DB 설정으로 기본값 덮어쓰기
    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, defaultSettings as Record<string, string>)

    return NextResponse.json({
      success: true,
      settings: settingsMap,
    })
  } catch (error) {
    console.error('알림 설정 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '알림 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/notifications/settings
 * 알림 설정 업데이트
 */
export async function PUT(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: '설정 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 설정 업데이트 (upsert)
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.notificationSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      message: '알림 설정이 저장되었습니다.',
    })
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '알림 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

