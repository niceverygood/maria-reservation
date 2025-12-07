import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 기존 데이터 삭제
  await prisma.appointment.deleteMany()
  await prisma.scheduleException.deleteMany()
  await prisma.scheduleTemplate.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.adminUser.deleteMany()

  // 관리자 계정 생성
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.adminUser.create({
    data: {
      name: '관리자',
      email: 'admin@maria.com',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('✅ 관리자 계정 생성:', admin.email)

  // 일산마리아병원 의사 정보 생성
  const doctors = await Promise.all([
    // 이재호 원장
    prisma.doctor.create({
      data: {
        name: '이재호',
        department: '산부인과',
        position: '원장',
        isActive: true,
        bio: '현 일산마리아 원장\n전 평촌마리아 진료과장\n산부인과 전문의 자격 취득\n서울대학교병원 산부인과 전공의 과정 이수\n서울대학교 의과대학 졸업',
        scheduleTemplates: {
          create: [
            // 월요일
            { dayOfWeek: 1, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 1, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 화요일
            { dayOfWeek: 2, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 2, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 수요일 (오후 휴진)
            { dayOfWeek: 3, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 목요일
            { dayOfWeek: 4, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 4, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 금요일
            { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 5, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 토요일 (오전만)
            { dayOfWeek: 6, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
          ],
        },
      },
    }),

    // 신영관 원장
    prisma.doctor.create({
      data: {
        name: '신영관',
        department: '산부인과',
        position: '원장',
        isActive: true,
        bio: '현 일산마리아 원장\n전 제주마리아 원장\n의학박사 전문의\n서울대학교병원 산부인과 전임의\n산부인과 전문의 자격 취득\n서울대학교병원 산부인과 전공의 과정 이수\n서울대학교 의과대학 졸업',
        scheduleTemplates: {
          create: [
            // 월~금 오전만
            { dayOfWeek: 1, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 2, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 3, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 4, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 토요일 오전
            { dayOfWeek: 6, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
          ],
        },
      },
    }),

    // 김하신 부장
    prisma.doctor.create({
      data: {
        name: '김하신',
        department: '산부인과',
        position: '부장',
        isActive: true,
        bio: '현 일산마리아 진료부장\n서울대학교병원 임상강사 역임\n산부인과 전문의 자격 취득\n서울대학교병원 산부인과 전공의 과정 이수\n서울대학교병원 인턴\n서울대학교 의과대학 산부인과학 석사\n전남대학교 의과대학 졸업',
        scheduleTemplates: {
          create: [
            // 월요일 (오후 휴진)
            { dayOfWeek: 1, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 화요일 (오후 휴진)
            { dayOfWeek: 2, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 수요일
            { dayOfWeek: 3, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 목요일 (오후 휴진)
            { dayOfWeek: 4, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 금요일
            { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 5, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 토요일 오전
            { dayOfWeek: 6, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
          ],
        },
      },
    }),

    // 주이영 과장
    prisma.doctor.create({
      data: {
        name: '주이영',
        department: '산부인과',
        position: '과장',
        isActive: true,
        bio: '현 일산마리아 진료과장\n산부인과 전문의 자격 취득\n서울대학교병원 산부인과 전공의 과정 이수\n서울대학교 의과대학 졸업',
        scheduleTemplates: {
          create: [
            // 월요일
            { dayOfWeek: 1, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 1, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 화요일 (오후 휴진)
            { dayOfWeek: 2, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 수요일 (오후 휴진)
            { dayOfWeek: 3, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 목요일
            { dayOfWeek: 4, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 4, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 금요일 (오후 휴진)
            { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 토요일 오전
            { dayOfWeek: 6, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
          ],
        },
      },
    }),

    // 조수민 과장
    prisma.doctor.create({
      data: {
        name: '조수민',
        department: '산부인과',
        position: '과장',
        isActive: true,
        bio: '일산마리아 진료과장\n고려대학교 안암병원 산부인과 생식내분비 전임의\n산부인과 전문의 자격 취득\n고려대학교 산부인과 전공의 과정 이수\n고려대학교 의학전문대학원 졸업\n고려대학교 생명공학부 졸업',
        scheduleTemplates: {
          create: [
            // 월요일 (오후 휴진)
            { dayOfWeek: 1, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 화요일
            { dayOfWeek: 2, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 2, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 수요일
            { dayOfWeek: 3, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
            // 목요일 (오후 휴진)
            { dayOfWeek: 4, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 금요일 (오후 휴진)
            { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 20 },
            // 토요일 오전
            { dayOfWeek: 6, startTime: '07:30', endTime: '12:00', slotIntervalMinutes: 15, dailyMaxAppointments: 15 },
          ],
        },
      },
    }),

    // 변희 마취과장
    prisma.doctor.create({
      data: {
        name: '변희',
        department: '마취통증의학과',
        position: '마취과장',
        isActive: true,
        bio: '현 일산마리아 마취과장\n전 일산차병원 마취과장\n전 충무로 제일병원 마취과장\n전 신촌세브란스병원 임상전문의\n대한마취통증의학회 정회원\n마취통증의학과전문의 자격 취득\n신촌 세브란스병원 마취통증의학과 전공의수료\n이화여자대학교 의학과 졸업',
        scheduleTemplates: {
          create: [], // 마취과는 별도 예약 없음
        },
      },
    }),
  ])

  console.log('✅ 의사 정보 생성 완료:')
  doctors.forEach((doc) => {
    console.log(`   - ${doc.name} ${doc.position} (${doc.department})`)
  })

  console.log('\n🎉 시드 데이터 생성 완료!')
}

main()
  .catch((e) => {
    console.error('❌ 시드 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
