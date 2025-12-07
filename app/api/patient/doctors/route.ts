import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// 메모리 캐시 (30초) - 슬롯 정보는 자주 변경될 수 있으므로 짧게
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30초

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  return null
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * GET /api/patient/doctors
 * 환자용 - 활성화된 의사 목록 조회 (최적화 버전)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const date = searchParams.get('date')
    const withSlots = searchParams.get('withSlots') === 'true'

    // 기본 쿼리 조건
    const whereClause: Record<string, unknown> = { isActive: true }
    if (department) whereClause.department = department

    // 날짜가 없으면 전체 의사 목록만 반환 (캐시 적용)
    if (!date) {
      const cacheKey = `doctors-no-date-${department || 'all'}`
      const cachedData = getCached<{ doctors: unknown[]; departments: string[] }>(cacheKey)
      if (cachedData) {
        return NextResponse.json({ success: true, ...cachedData })
      }

      const [doctors, departments] = await Promise.all([
        prisma.doctor.findMany({
          where: whereClause,
          select: { id: true, name: true, department: true, position: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.doctor.findMany({
          where: { isActive: true },
          select: { department: true },
          distinct: ['department'],
        }),
      ])

      const result = {
        doctors,
        departments: departments.map(d => d.department),
      }
      setCache(cacheKey, result)

      return NextResponse.json({ success: true, ...result }, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      })
    }

    // 날짜가 있는 경우 - 한 번에 모든 데이터 조회
    const targetDate = new Date(date + 'T00:00:00') // 로컬 시간 기준
    const dayOfWeek = targetDate.getDay()

    const [
      doctors,
      scheduleTemplates,
      offExceptions,
      customExceptions,
      bookedAppointments, // PENDING과 BOOKED 모두 조회
      allDepartments,
    ] = await Promise.all([
      // 활성 의사 목록
      prisma.doctor.findMany({
        where: whereClause,
        select: { id: true, name: true, department: true, position: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      // 해당 요일 스케줄 템플릿
      prisma.scheduleTemplate.findMany({
        where: { dayOfWeek, isActive: true },
        select: { doctorId: true, startTime: true, endTime: true, slotIntervalMinutes: true },
      }),
      // 해당 날짜 휴진
      prisma.scheduleException.findMany({
        where: { date, type: 'OFF' },
        select: { doctorId: true },
      }),
      // 해당 날짜 커스텀 스케줄
      prisma.scheduleException.findMany({
        where: { date, type: 'CUSTOM' },
        select: { doctorId: true, customStart: true, customEnd: true, customInterval: true },
      }),
      // 해당 날짜 예약된 시간 (PENDING과 BOOKED 모두)
      prisma.appointment.findMany({
        where: { date, status: { in: ['PENDING', 'BOOKED'] } },
        select: { doctorId: true, time: true },
      }),
      // 전체 진료과
      prisma.doctor.findMany({
        where: { isActive: true },
        select: { department: true },
        distinct: ['department'],
      }),
    ])

    // 휴진 의사 Set
    const offDoctorIds = new Set(offExceptions.map(e => e.doctorId))

    // 의사별 스케줄 템플릿
    const templatesByDoctor = new Map<string, typeof scheduleTemplates>()
    for (const t of scheduleTemplates) {
      if (!templatesByDoctor.has(t.doctorId)) {
        templatesByDoctor.set(t.doctorId, [])
      }
      templatesByDoctor.get(t.doctorId)!.push(t)
    }

    // 커스텀 스케줄
    const customByDoctor = new Map(customExceptions.map(c => [c.doctorId, c]))

    // 예약된 시간 (PENDING + BOOKED)
    const bookedByDoctor = new Map<string, Set<string>>()
    for (const a of bookedAppointments) {
      if (!bookedByDoctor.has(a.doctorId)) {
        bookedByDoctor.set(a.doctorId, new Set())
      }
      bookedByDoctor.get(a.doctorId)!.add(a.time)
    }

    // 슬롯 생성 함수
    const generateSlots = (start: string, end: string, interval: number): string[] => {
      const slots: string[] = []
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let curr = sh * 60 + sm
      const endMin = eh * 60 + em
      while (curr < endMin) {
        slots.push(`${String(Math.floor(curr / 60)).padStart(2, '0')}:${String(curr % 60).padStart(2, '0')}`)
        curr += interval
      }
      return slots
    }

    // 오늘 날짜 체크 (2시간 이내 슬롯 제외)
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const isToday = date === todayStr
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const MIN_ADVANCE = 120 // 2시간 전

    // 각 의사별 슬롯 계산
    const doctorsWithSlots = doctors
      .filter(d => !offDoctorIds.has(d.id))
      .map(doctor => {
        let allSlots: string[] = []
        const custom = customByDoctor.get(doctor.id)
        const templates = templatesByDoctor.get(doctor.id) || []

        if (custom?.customStart && custom?.customEnd) {
          allSlots = generateSlots(custom.customStart, custom.customEnd, custom.customInterval || 15)
        } else if (templates.length > 0) {
          for (const t of templates) {
            allSlots.push(...generateSlots(t.startTime, t.endTime, t.slotIntervalMinutes))
          }
        }

        // 중복 제거 및 정렬
        allSlots = [...new Set(allSlots)].sort()

        // 예약된 시간 제외 (PENDING + BOOKED)
        const booked = bookedByDoctor.get(doctor.id) || new Set()
        let available = allSlots.filter(s => !booked.has(s))

        // 오늘이면 지난 시간 및 2시간 이내 슬롯 제외
        if (isToday) {
          available = available.filter(s => {
            const [h, m] = s.split(':').map(Number)
            return h * 60 + m - currentMinutes >= MIN_ADVANCE
          })
        }

        return {
          ...doctor,
          availableSlots: withSlots ? available.length : undefined,
          totalSlots: withSlots ? allSlots.length : undefined,
        }
      })
      .filter(d => !withSlots || (d.availableSlots && d.availableSlots > 0))

    return NextResponse.json({
      success: true,
      doctors: doctorsWithSlots,
      departments: allDepartments.map(d => d.department),
    })
  } catch (error) {
    console.error('의사 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '의사 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
