import { NextResponse } from 'next/server'
import { sendReminders1Day, getReminderSettings } from '@/lib/notification/reminderService'

// Vercel Cron에서 호출 - 매일 오후 6시 (KST)
// 또는 외부 스케줄러에서 직접 호출

/**
 * GET /api/cron/reminder-1day
 * 1일 전 예약 리마인더 발송
 * 
 * Vercel Cron 또는 외부 스케줄러에서 호출
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  try {
    // 인증 확인 (Vercel Cron 또는 수동 호출)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Vercel Cron 자동 호출인 경우 (x-vercel-cron-signature)
    const isVercelCron = request.headers.get('x-vercel-cron-signature')
    
    if (!isVercelCron && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: '인증이 필요합니다.' },
          { status: 401 }
        )
      }
    }

    // 리마인더 설정 확인
    const settings = await getReminderSettings()
    if (!settings.reminder1DayEnabled) {
      return NextResponse.json({
        success: true,
        message: '1일전 리마인더가 비활성화되어 있습니다.',
        skipped: true,
      })
    }

    // 리마인더 발송
    const result = await sendReminders1Day()

    return NextResponse.json({
      success: true,
      ...result,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] 1일전 리마인더 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '리마인더 발송 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}




