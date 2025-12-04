import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 1. 관리자 계정 생성
  const adminPassword = await bcrypt.hash('admin123', 12)
  const staffPassword = await bcrypt.hash('staff123', 12)

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@maria.com' },
    update: {},
    create: {
      name: '관리자',
      email: 'admin@maria.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ 관리자 계정 생성:', admin.email)

  const staff = await prisma.adminUser.upsert({
    where: { email: 'staff@maria.com' },
    update: {},
    create: {
      name: '원무과직원',
      email: 'staff@maria.com',
      passwordHash: staffPassword,
      role: 'STAFF',
    },
  })
  console.log('✅ 직원 계정 생성:', staff.email)

  // 2. 의사 생성
  const doctor1 = await prisma.doctor.upsert({
    where: { id: 'doctor-1' },
    update: {},
    create: {
      id: 'doctor-1',
      name: '김철수',
      department: '산부인과',
      sortOrder: 1,
    },
  })
  console.log('✅ 의사 생성:', doctor1.name)

  const doctor2 = await prisma.doctor.upsert({
    where: { id: 'doctor-2' },
    update: {},
    create: {
      id: 'doctor-2',
      name: '이영희',
      department: '내과',
      sortOrder: 2,
    },
  })
  console.log('✅ 의사 생성:', doctor2.name)

  const doctor3 = await prisma.doctor.upsert({
    where: { id: 'doctor-3' },
    update: {},
    create: {
      id: 'doctor-3',
      name: '박지민',
      department: '산부인과',
      sortOrder: 3,
    },
  })
  console.log('✅ 의사 생성:', doctor3.name)

  // 3. 스케줄 템플릿 생성 (김철수 - 월~금)
  const scheduleData = [
    // 김철수: 월~금 오전 (09:00~12:00)
    { doctorId: 'doctor-1', dayOfWeek: 1, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 15 },
    { doctorId: 'doctor-1', dayOfWeek: 2, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 15 },
    { doctorId: 'doctor-1', dayOfWeek: 3, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 15 },
    { doctorId: 'doctor-1', dayOfWeek: 4, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 15 },
    { doctorId: 'doctor-1', dayOfWeek: 5, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 15 },
    
    // 이영희: 월~금 오후 (14:00~17:00)
    { doctorId: 'doctor-2', dayOfWeek: 1, dayStartTime: '14:00', dayEndTime: '17:00', slotIntervalMinutes: 20 },
    { doctorId: 'doctor-2', dayOfWeek: 2, dayStartTime: '14:00', dayEndTime: '17:00', slotIntervalMinutes: 20 },
    { doctorId: 'doctor-2', dayOfWeek: 3, dayStartTime: '14:00', dayEndTime: '17:00', slotIntervalMinutes: 20 },
    { doctorId: 'doctor-2', dayOfWeek: 4, dayStartTime: '14:00', dayEndTime: '17:00', slotIntervalMinutes: 20 },
    { doctorId: 'doctor-2', dayOfWeek: 5, dayStartTime: '14:00', dayEndTime: '17:00', slotIntervalMinutes: 20 },
    
    // 박지민: 월수금 오전 (09:00~12:00)
    { doctorId: 'doctor-3', dayOfWeek: 1, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 10 },
    { doctorId: 'doctor-3', dayOfWeek: 3, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 10 },
    { doctorId: 'doctor-3', dayOfWeek: 5, dayStartTime: '09:00', dayEndTime: '12:00', slotIntervalMinutes: 10 },
  ]

  for (const schedule of scheduleData) {
    await prisma.scheduleTemplate.upsert({
      where: {
        doctorId_dayOfWeek: {
          doctorId: schedule.doctorId,
          dayOfWeek: schedule.dayOfWeek,
        },
      },
      update: schedule,
      create: schedule,
    })
  }
  console.log('✅ 스케줄 템플릿 생성 완료')

  // 4. 테스트 환자 생성
  const patient = await prisma.patient.upsert({
    where: {
      name_birthDate_phone: {
        name: '홍길동',
        birthDate: '19900101',
        phone: '01012345678',
      },
    },
    update: {},
    create: {
      name: '홍길동',
      birthDate: '19900101',
      phone: '01012345678',
    },
  })
  console.log('✅ 테스트 환자 생성:', patient.name)

  console.log('')
  console.log('🎉 시드 데이터 생성 완료!')
  console.log('')
  console.log('📋 테스트 계정 정보:')
  console.log('  - 관리자: admin@maria.com / admin123')
  console.log('  - 직원:   staff@maria.com / staff123')
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
