/**
 * 알림 테이블 생성 스크립트
 * 실행: npx tsx scripts/create-notification-tables.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createNotificationTables() {
  console.log('🔧 알림 테이블 생성 시작...')

  try {
    // 1. notification_logs 테이블 생성
    console.log('📋 notification_logs 테이블 생성 중...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notification_logs" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "type" TEXT NOT NULL,
        "channel" TEXT NOT NULL,
        "recipientPhone" TEXT NOT NULL,
        "recipientName" TEXT NOT NULL,
        "appointmentId" TEXT,
        "templateCode" TEXT,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "errorMessage" TEXT,
        "sentAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
      )
    `)
    console.log('✅ notification_logs 테이블 생성 완료')

    // 2. notification_settings 테이블 생성
    console.log('📋 notification_settings 테이블 생성 중...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notification_settings" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
      )
    `)
    console.log('✅ notification_settings 테이블 생성 완료')

    // 3. 인덱스 생성
    console.log('🔍 인덱스 생성 중...')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_appointmentId_idx" 
      ON "notification_logs"("appointmentId")
    `).catch(() => console.log('  - appointmentId 인덱스 이미 존재'))

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_status_createdAt_idx" 
      ON "notification_logs"("status", "createdAt")
    `).catch(() => console.log('  - status_createdAt 인덱스 이미 존재'))

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_type_createdAt_idx" 
      ON "notification_logs"("type", "createdAt")
    `).catch(() => console.log('  - type_createdAt 인덱스 이미 존재'))

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_key_key" 
      ON "notification_settings"("key")
    `).catch(() => console.log('  - key 유니크 인덱스 이미 존재'))

    console.log('✅ 인덱스 생성 완료')

    // 4. 기본 설정 삽입
    console.log('⚙️ 기본 설정 삽입 중...')
    
    const defaultSettings = [
      { key: 'notification_enabled', value: 'true', description: '알림 기능 활성화' },
      { key: 'confirm_enabled', value: 'true', description: '예약 확정 알림' },
      { key: 'cancel_enabled', value: 'true', description: '예약 취소 알림' },
      { key: 'reject_enabled', value: 'true', description: '예약 거절 알림' },
      { key: 'reminder_1day_enabled', value: 'true', description: '1일전 리마인더' },
      { key: 'reminder_1day_time', value: '18:00', description: '1일전 리마인더 시간' },
      { key: 'reminder_today_enabled', value: 'true', description: '당일 리마인더' },
      { key: 'reminder_today_time', value: '08:00', description: '당일 리마인더 시간' },
    ]

    for (const setting of defaultSettings) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "notification_settings" ("id", "key", "value", "description", "updatedAt")
          VALUES (gen_random_uuid()::text, '${setting.key}', '${setting.value}', '${setting.description}', CURRENT_TIMESTAMP)
          ON CONFLICT ("key") DO NOTHING
        `)
      } catch (e) {
        // 이미 존재하면 스킵
      }
    }
    console.log('✅ 기본 설정 삽입 완료')

    // 5. 테이블 확인
    console.log('')
    console.log('📊 생성된 테이블 확인:')
    
    const logsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM notification_logs` as { count: bigint }[]
    console.log(`  - notification_logs: ${logsCount[0].count}개 레코드`)
    
    const settingsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM notification_settings` as { count: bigint }[]
    console.log(`  - notification_settings: ${settingsCount[0].count}개 레코드`)

    console.log('')
    console.log('🎉 알림 테이블 생성 완료!')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 타임아웃 설정
const timeout = setTimeout(() => {
  console.error('⏰ 타임아웃! 30초 초과')
  process.exit(1)
}, 30000)

createNotificationTables()
  .then(() => {
    clearTimeout(timeout)
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    clearTimeout(timeout)
    process.exit(1)
  })




