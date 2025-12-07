import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📦 schedule_change_requests 테이블 생성 중...\n')

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS schedule_change_requests (
        id VARCHAR(255) PRIMARY KEY,
        "doctorId" VARCHAR(255) NOT NULL,
        "appointmentId" VARCHAR(255),
        "requestType" VARCHAR(50) NOT NULL,
        "originalDate" VARCHAR(20),
        "originalTime" VARCHAR(20),
        "newDate" VARCHAR(20),
        "newTime" VARCHAR(20),
        "offDate" VARCHAR(20),
        "offReason" TEXT,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        "processedBy" VARCHAR(255),
        "processedAt" TIMESTAMP,
        "rejectReason" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ schedule_change_requests 테이블 생성 완료')
  } catch (e: unknown) {
    const error = e as { message?: string }
    if (error.message?.includes('already exists')) {
      console.log('ℹ️ 테이블이 이미 존재합니다')
    } else {
      console.log('⚠️ 테이블 생성:', error.message)
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_change_requests_doctor_status 
      ON schedule_change_requests ("doctorId", status)
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_change_requests_status_created 
      ON schedule_change_requests (status, "createdAt")
    `)
    console.log('✅ 인덱스 생성 완료')
  } catch (e: unknown) {
    const error = e as { message?: string }
    console.log('⚠️ 인덱스 생성:', error.message)
  }

  console.log('\n🎉 완료!')
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
