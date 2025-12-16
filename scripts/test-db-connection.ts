/**
 * DB 연결 테스트 스크립트
 * 실행: npx tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testConnection() {
  console.log('🔌 DB 연결 테스트 시작...')
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))
  
  const startTime = Date.now()
  
  try {
    // 간단한 쿼리 테스트
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ 연결 성공!')
    console.log('결과:', result)
    console.log(`⏱️ 소요 시간: ${Date.now() - startTime}ms`)
    
    // 테이블 개수 확인
    const doctorCount = await prisma.doctor.count()
    console.log(`👨‍⚕️ 의사 수: ${doctorCount}`)
    
    const patientCount = await prisma.patient.count()
    console.log(`🧑‍🤝‍🧑 환자 수: ${patientCount}`)
    
    const appointmentCount = await prisma.appointment.count()
    console.log(`📅 예약 수: ${appointmentCount}`)
    
  } catch (error) {
    console.error('❌ 연결 실패!')
    console.error('에러:', error)
    console.log(`⏱️ 실패까지 소요 시간: ${Date.now() - startTime}ms`)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 연결 종료')
  }
}

// 타임아웃 설정
const timeout = setTimeout(() => {
  console.error('⏰ 타임아웃! 15초 초과')
  process.exit(1)
}, 15000)

testConnection()
  .then(() => {
    clearTimeout(timeout)
    process.exit(0)
  })
  .catch(() => {
    clearTimeout(timeout)
    process.exit(1)
  })





