-- ============================================
-- 일산마리아병원 재진 예약 시스템 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. doctors 테이블
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT,
  bio TEXT,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. schedule_templates 테이블
CREATE TABLE IF NOT EXISTS schedule_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
  "dailyMaxAppointments" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE("doctorId", "dayOfWeek", "startTime")
);

-- 3. schedule_exceptions 테이블
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  "customStart" TEXT,
  "customEnd" TEXT,
  "customInterval" INTEGER,
  reason TEXT,
  UNIQUE("doctorId", date)
);

-- 4. patients 테이블
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  "birthDate" TEXT,
  phone TEXT,
  "kakaoId" TEXT UNIQUE,
  "kakaoEmail" TEXT,
  "kakaoProfile" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, "birthDate", phone)
);

-- 5. appointments 테이블
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BOOKED',
  memo TEXT,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- appointments 인덱스
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments("doctorId", date);
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments("patientId");
CREATE INDEX IF NOT EXISTS appointments_date_status_idx ON appointments(date, status);

-- 6. admin_users 테이블
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 초기 데이터: 의사 정보
-- ============================================
INSERT INTO doctors (id, name, department, position, bio, "isActive", "sortOrder")
VALUES 
  ('doc-1', '오은미', '산부인과', '원장', '산부인과 전문의\n고위험 임신 전문', TRUE, 1),
  ('doc-2', '정요한', '산부인과', '부원장', '산부인과 전문의\n부인과 내시경 수술 전문', TRUE, 2),
  ('doc-3', '강민정', '산부인과', '과장', '산부인과 전문의\n산전관리 전문', TRUE, 3),
  ('doc-4', '김혜진', '산부인과', '전문의', '산부인과 전문의', TRUE, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  bio = EXCLUDED.bio,
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- ============================================
-- 초기 데이터: 스케줄 템플릿 (월~금 오전/오후)
-- ============================================
-- 오은미 원장 스케줄
INSERT INTO schedule_templates ("doctorId", "dayOfWeek", "startTime", "endTime", "slotIntervalMinutes", "isActive")
VALUES 
  ('doc-1', 1, '09:00', '12:30', 15, TRUE),
  ('doc-1', 1, '14:00', '18:00', 15, TRUE),
  ('doc-1', 2, '09:00', '12:30', 15, TRUE),
  ('doc-1', 2, '14:00', '18:00', 15, TRUE),
  ('doc-1', 3, '09:00', '12:30', 15, TRUE),
  ('doc-1', 3, '14:00', '18:00', 15, TRUE),
  ('doc-1', 4, '09:00', '12:30', 15, TRUE),
  ('doc-1', 4, '14:00', '18:00', 15, TRUE),
  ('doc-1', 5, '09:00', '12:30', 15, TRUE),
  ('doc-1', 5, '14:00', '18:00', 15, TRUE),
  ('doc-1', 6, '09:00', '13:00', 15, TRUE)
ON CONFLICT ("doctorId", "dayOfWeek", "startTime") DO NOTHING;

-- 정요한 부원장 스케줄
INSERT INTO schedule_templates ("doctorId", "dayOfWeek", "startTime", "endTime", "slotIntervalMinutes", "isActive")
VALUES 
  ('doc-2', 1, '09:00', '12:30', 15, TRUE),
  ('doc-2', 1, '14:00', '18:00', 15, TRUE),
  ('doc-2', 2, '09:00', '12:30', 15, TRUE),
  ('doc-2', 2, '14:00', '18:00', 15, TRUE),
  ('doc-2', 3, '09:00', '12:30', 15, TRUE),
  ('doc-2', 3, '14:00', '18:00', 15, TRUE),
  ('doc-2', 4, '09:00', '12:30', 15, TRUE),
  ('doc-2', 4, '14:00', '18:00', 15, TRUE),
  ('doc-2', 5, '09:00', '12:30', 15, TRUE),
  ('doc-2', 5, '14:00', '18:00', 15, TRUE)
ON CONFLICT ("doctorId", "dayOfWeek", "startTime") DO NOTHING;

-- 강민정 과장 스케줄
INSERT INTO schedule_templates ("doctorId", "dayOfWeek", "startTime", "endTime", "slotIntervalMinutes", "isActive")
VALUES 
  ('doc-3', 1, '09:00', '12:30', 15, TRUE),
  ('doc-3', 1, '14:00', '17:00', 15, TRUE),
  ('doc-3', 2, '09:00', '12:30', 15, TRUE),
  ('doc-3', 2, '14:00', '17:00', 15, TRUE),
  ('doc-3', 3, '09:00', '12:30', 15, TRUE),
  ('doc-3', 3, '14:00', '17:00', 15, TRUE),
  ('doc-3', 4, '09:00', '12:30', 15, TRUE),
  ('doc-3', 4, '14:00', '17:00', 15, TRUE),
  ('doc-3', 5, '09:00', '12:30', 15, TRUE),
  ('doc-3', 5, '14:00', '17:00', 15, TRUE)
ON CONFLICT ("doctorId", "dayOfWeek", "startTime") DO NOTHING;

-- 김혜진 전문의 스케줄
INSERT INTO schedule_templates ("doctorId", "dayOfWeek", "startTime", "endTime", "slotIntervalMinutes", "isActive")
VALUES 
  ('doc-4', 1, '09:00', '12:30', 15, TRUE),
  ('doc-4', 1, '14:00', '17:00', 15, TRUE),
  ('doc-4', 3, '09:00', '12:30', 15, TRUE),
  ('doc-4', 3, '14:00', '17:00', 15, TRUE),
  ('doc-4', 5, '09:00', '12:30', 15, TRUE),
  ('doc-4', 5, '14:00', '17:00', 15, TRUE)
ON CONFLICT ("doctorId", "dayOfWeek", "startTime") DO NOTHING;

-- ============================================
-- 초기 데이터: 관리자 계정
-- 비밀번호: admin123 (bcrypt 해시)
-- ============================================
INSERT INTO admin_users (id, name, email, "passwordHash", role, "isActive")
VALUES (
  'admin-1',
  '관리자',
  'admin@maria.co.kr',
  '$2a$12$LQv3c1yqBwVVNWqB7OE5dO6YCIhfHq1FHPNpU5.r1SkC/Z6.YT8.K',
  'ADMIN',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 완료 메시지
SELECT 'Schema and initial data created successfully!' AS result;

