-- 일산마리아병원 예약 시스템 스키마 (서울 리전)
-- Supabase SQL Editor에서 실행

-- 1. 의사 테이블
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT,
  bio TEXT,
  "imageUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "sortOrder" INTEGER DEFAULT 0,
  email TEXT UNIQUE,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 스케줄 템플릿
CREATE TABLE IF NOT EXISTS schedule_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotIntervalMinutes" INTEGER DEFAULT 15,
  "dailyMaxAppointments" INTEGER,
  "isActive" BOOLEAN DEFAULT true,
  UNIQUE("doctorId", "dayOfWeek", "startTime")
);

-- 3. 스케줄 예외
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  "customStart" TEXT,
  "customEnd" TEXT,
  "customInterval" INTEGER,
  reason TEXT,
  UNIQUE("doctorId", date)
);

-- 4. 환자
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "birthDate" TEXT,
  phone TEXT,
  "kakaoId" TEXT UNIQUE,
  "kakaoEmail" TEXT,
  "kakaoProfile" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, "birthDate", phone)
);

-- 5. 예약
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'BOOKED',
  memo TEXT,
  "reservedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 관리자
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role TEXT DEFAULT 'STAFF',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 관리자 알림
CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "appointmentId" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "adminId" TEXT REFERENCES admin_users(id) ON DELETE CASCADE
);

-- 8. 예약 변경 요청
CREATE TABLE IF NOT EXISTS schedule_change_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "requestType" TEXT NOT NULL,
  "originalDate" TEXT,
  "originalTime" TEXT,
  "newDate" TEXT,
  "newTime" TEXT,
  "offDate" TEXT,
  "offReason" TEXT,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  "processedBy" TEXT,
  "processedAt" TIMESTAMP WITH TIME ZONE,
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 알림 로그
CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "appointmentId" TEXT,
  "templateCode" TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 알림 설정
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 사전 계산된 슬롯 요약
CREATE TABLE IF NOT EXISTS daily_slot_summaries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL,
  date TEXT NOT NULL,
  "totalSlots" INTEGER DEFAULT 0,
  "availableSlots" INTEGER DEFAULT 0,
  "bookedSlots" INTEGER DEFAULT 0,
  "isOff" BOOLEAN DEFAULT false,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("doctorId", date)
);

-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_schedule_templates_doctor_day ON schedule_templates("doctorId", "dayOfWeek", "isActive");
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status ON appointments("doctorId", date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time ON appointments("doctorId", date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status ON appointments("patientId", date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_reserved_at ON appointments("reservedAt");
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications("isRead", "createdAt");
CREATE INDEX IF NOT EXISTS idx_schedule_change_requests_doctor ON schedule_change_requests("doctorId", status);
CREATE INDEX IF NOT EXISTS idx_schedule_change_requests_status ON schedule_change_requests(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment ON notification_logs("appointmentId");
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_daily_slot_summaries_date ON daily_slot_summaries(date);
CREATE INDEX IF NOT EXISTS idx_daily_slot_summaries_doctor ON daily_slot_summaries("doctorId", date, "availableSlots");

-- ============================================
-- 기본 관리자 계정 생성
-- 비밀번호: admin123 (bcrypt 해시)
-- ============================================

INSERT INTO admin_users (id, name, email, "passwordHash", role, "isActive")
VALUES (
  'admin-default',
  '관리자',
  'admin@maria.com',
  '$2a$10$rQnM1.j5B5Z5Z5Z5Z5Z5ZuJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'ADMIN',
  true
) ON CONFLICT (email) DO NOTHING;

SELECT 'Schema created successfully!' as result;




