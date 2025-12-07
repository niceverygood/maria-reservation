import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 의사별 로그인 정보 (이름 → 이메일, 비밀번호)
const doctorCredentials: Record<string, { email: string; password: string }> = {
  '이재호': { email: 'jaeho.lee@maria.com', password: 'maria2024!' },
  '주이영': { email: 'iyoung.joo@maria.com', password: 'maria2024!' },
  '변희': { email: 'hee.byun@maria.com', password: 'maria2024!' },
  '김하신': { email: 'hashin.kim@maria.com', password: 'maria2024!' },
  '신영관': { email: 'youngkwan.shin@maria.com', password: 'maria2024!' },
  '조수민': { email: 'sumin.cho@maria.com', password: 'maria2024!' },
  '임현선': { email: 'hyunsun.im@maria.com', password: 'maria2024!' },
  '김민수': { email: 'minsu.kim@maria.com', password: 'maria2024!' },
  '박지현': { email: 'jihyun.park@maria.com', password: 'maria2024!' },
  '정수민': { email: 'sumin.jung@maria.com', password: 'maria2024!' },
  '최영호': { email: 'youngho.choi@maria.com', password: 'maria2024!' },
}

async function main() {
  console.log('🔐 의사 로그인 정보 업데이트 시작...\n')

  // 모든 의사 조회
  const doctors = await prisma.doctor.findMany({
    orderBy: { name: 'asc' },
  })

  console.log(`총 ${doctors.length}명의 의사 발견\n`)

  for (const doctor of doctors) {
    const credentials = doctorCredentials[doctor.name]
    
    if (credentials) {
      // 비밀번호 해싱
      const passwordHash = await bcrypt.hash(credentials.password, 10)
      
      // 의사 정보 업데이트
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: {
          email: credentials.email,
          passwordHash,
        },
      })
      
      console.log(`✅ ${doctor.name} (${doctor.department})`)
      console.log(`   📧 이메일: ${credentials.email}`)
      console.log(`   🔑 비밀번호: ${credentials.password}`)
      console.log('')
    } else {
      console.log(`⚠️ ${doctor.name} - 등록 정보 없음, 건너뜀`)
    }
  }

  console.log('\n🎉 의사 로그인 정보 업데이트 완료!')
  console.log('\n📌 로그인 방법:')
  console.log('   1. /admin/login 페이지로 이동')
  console.log('   2. 위 이메일/비밀번호로 로그인')
  console.log('   3. "내 예약 관리" 메뉴에서 본인 예약 확인/관리')
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
