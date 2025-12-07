-- 알림 로그 테이블 (NotificationLog)
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
);

-- 알림 설정 테이블 (NotificationSetting)
CREATE TABLE IF NOT EXISTS "notification_settings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS "notification_logs_appointmentId_idx" ON "notification_logs"("appointmentId");
CREATE INDEX IF NOT EXISTS "notification_logs_status_createdAt_idx" ON "notification_logs"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "notification_logs_type_createdAt_idx" ON "notification_logs"("type", "createdAt");

-- Unique 제약조건
CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_key_key" ON "notification_settings"("key");

-- 기본 알림 설정 삽입
INSERT INTO "notification_settings" ("id", "key", "value", "description") VALUES
    (gen_random_uuid()::text, 'notification_enabled', 'true', '알림 기능 활성화'),
    (gen_random_uuid()::text, 'confirm_enabled', 'true', '예약 확정 알림'),
    (gen_random_uuid()::text, 'cancel_enabled', 'true', '예약 취소 알림'),
    (gen_random_uuid()::text, 'reject_enabled', 'true', '예약 거절 알림'),
    (gen_random_uuid()::text, 'reminder_1day_enabled', 'true', '1일전 리마인더'),
    (gen_random_uuid()::text, 'reminder_1day_time', '18:00', '1일전 리마인더 시간'),
    (gen_random_uuid()::text, 'reminder_today_enabled', 'true', '당일 리마인더'),
    (gen_random_uuid()::text, 'reminder_today_time', '08:00', '당일 리마인더 시간')
ON CONFLICT ("key") DO NOTHING;

-- 완료 메시지
SELECT 'Notification tables created successfully!' as result;

