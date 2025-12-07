import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📋 의사 목록 확인 중...\n')

  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      name: true,
      department: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  })

  for (const doctor of doctors) {
    console.log(`${doctor.name} (${doctor.department})`)
    console.log(`  - ID: ${doctor.id}`)
    console.log(`  - 이메일: ${doctor.email || '없음'}`)
    console.log(`  - 비밀번호 해시: ${doctor.passwordHash ? '설정됨 (' + doctor.passwordHash.substring(0, 20) + '...)' : '없음'}`)
    console.log(`  - 활성: ${doctor.isActive}`)
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

