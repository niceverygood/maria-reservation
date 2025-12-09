import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📦 컬럼명 수정 중...\n')

  try {
    // password_hash를 passwordHash로 변경 (Prisma 스키마와 일치하도록)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE doctors 
      RENAME COLUMN password_hash TO "passwordHash"
    `)
    console.log('✅ password_hash → passwordHash 변경 완료')
  } catch (e: unknown) {
    const error = e as { message?: string }
    console.log('⚠️ 컬럼명 변경:', error.message)
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




