import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📦 doctors 테이블에 email, password_hash 컬럼 추가 중...\n')

  try {
    // email 컬럼 추가
    await prisma.$executeRawUnsafe(`
      ALTER TABLE doctors 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE
    `)
    console.log('✅ email 컬럼 추가 완료')
  } catch (e: unknown) {
    const error = e as { message?: string }
    if (error.message?.includes('already exists')) {
      console.log('ℹ️ email 컬럼이 이미 존재합니다')
    } else {
      console.log('⚠️ email 컬럼 추가:', error.message)
    }
  }

  try {
    // password_hash 컬럼 추가
    await prisma.$executeRawUnsafe(`
      ALTER TABLE doctors 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `)
    console.log('✅ password_hash 컬럼 추가 완료')
  } catch (e: unknown) {
    const error = e as { message?: string }
    if (error.message?.includes('already exists')) {
      console.log('ℹ️ password_hash 컬럼이 이미 존재합니다')
    } else {
      console.log('⚠️ password_hash 컬럼 추가:', error.message)
    }
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

