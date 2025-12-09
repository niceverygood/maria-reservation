import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'hashin.kim@maria.com'
  const password = 'maria2024!'

  console.log(`🔐 로그인 테스트: ${email}\n`)

  // 의사 조회
  const doctor = await prisma.doctor.findFirst({
    where: { email },
  })

  if (!doctor) {
    console.log('❌ 의사를 찾을 수 없음')
    return
  }

  console.log('✅ 의사 발견:', doctor.name)
  console.log('  - 활성:', doctor.isActive)
  console.log('  - 비밀번호 해시:', doctor.passwordHash ? '있음' : '없음')

  if (!doctor.passwordHash) {
    console.log('❌ 비밀번호 해시가 없음')
    return
  }

  // 비밀번호 확인
  const isValid = await bcrypt.compare(password, doctor.passwordHash)
  console.log('\n🔑 비밀번호 검증:', isValid ? '✅ 성공' : '❌ 실패')
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




