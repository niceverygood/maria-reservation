import { NextResponse } from 'next/server'
import { precomputeSlotSummaries, cleanupOldSummaries } from '@/lib/slots/precompute'

/**
 * GET /api/cron/precompute-slots
 * Vercel Cron Job으로 매일 자정에 호출
 * 향후 4주치 슬롯 요약을 사전 계산
 */
export async function GET(request: Request) {
  try {
    // Cron 인증 확인 (Vercel Cron은 자동으로 Authorization 헤더 추가)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      // 개발 환경에서는 인증 없이 허용
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[Cron] 슬롯 사전 계산 시작...')

    // 1. 오래된 데이터 정리
    const deletedCount = await cleanupOldSummaries()
    console.log(`[Cron] 과거 데이터 ${deletedCount}건 삭제`)

    // 2. 향후 28일치 슬롯 계산
    const result = await precomputeSlotSummaries(28)
    console.log(`[Cron] ${result.updated}건 슬롯 요약 갱신 완료`)

    if (result.errors.length > 0) {
      console.error('[Cron] 오류 발생:', result.errors)
    }

    return NextResponse.json({
      success: true,
      message: '슬롯 사전 계산 완료',
      updated: result.updated,
      deleted: deletedCount,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[Cron] 슬롯 사전 계산 오류:', error)
    return NextResponse.json(
      { success: false, error: '슬롯 사전 계산 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

