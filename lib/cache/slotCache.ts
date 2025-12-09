/**
 * 서버 메모리 캐시 - 예약 슬롯 조회 최적화
 * 
 * 특징:
 * - 동일한 doctorId + date 조합에 대해 30초간 캐시
 * - 예약 생성/취소 시 해당 키 무효화
 * - Serverless 환경에서도 동일 인스턴스 내에서 유효
 */

interface CacheEntry<T> {
  data: T
  expireAt: number
}

interface SlotData {
  doctor: { id: string; name: string; department: string }
  date: string
  slots: { time: string; available: boolean }[]
  availableCount: number
  totalCount: number
}

interface DoctorsByDateData {
  doctors: { id: string; name: string; department: string; position?: string; availableSlots: number }[]
}

// 글로벌 캐시 객체
const slotCache = new Map<string, CacheEntry<SlotData>>()
const doctorsByDateCache = new Map<string, CacheEntry<DoctorsByDateData>>()
const scheduleTemplateCache = new Map<string, CacheEntry<unknown>>()

// 캐시 TTL (밀리초)
const SLOT_CACHE_TTL = 30000 // 30초
const SCHEDULE_CACHE_TTL = 300000 // 5분 (스케줄은 잘 안 바뀜)

/**
 * 슬롯 캐시 키 생성
 */
export function getSlotCacheKey(doctorId: string, date: string): string {
  return `slot:${doctorId}:${date}`
}

/**
 * 날짜별 의사 목록 캐시 키
 */
export function getDoctorsByDateKey(date: string): string {
  return `doctors-by-date:${date}`
}

/**
 * 스케줄 템플릿 캐시 키
 */
export function getScheduleKey(doctorId: string, dayOfWeek: number): string {
  return `schedule:${doctorId}:${dayOfWeek}`
}

/**
 * 슬롯 데이터 가져오기
 */
export function getCachedSlots(doctorId: string, date: string): SlotData | null {
  const key = getSlotCacheKey(doctorId, date)
  const entry = slotCache.get(key)
  
  if (entry && entry.expireAt > Date.now()) {
    return entry.data
  }
  
  // 만료된 엔트리 삭제
  if (entry) {
    slotCache.delete(key)
  }
  
  return null
}

/**
 * 슬롯 데이터 저장
 */
export function setCachedSlots(doctorId: string, date: string, data: SlotData): void {
  const key = getSlotCacheKey(doctorId, date)
  slotCache.set(key, {
    data,
    expireAt: Date.now() + SLOT_CACHE_TTL
  })
}

/**
 * 날짜별 의사 목록 가져오기
 */
export function getCachedDoctorsByDate(date: string): DoctorsByDateData | null {
  const key = getDoctorsByDateKey(date)
  const entry = doctorsByDateCache.get(key)
  
  if (entry && entry.expireAt > Date.now()) {
    return entry.data
  }
  
  if (entry) {
    doctorsByDateCache.delete(key)
  }
  
  return null
}

/**
 * 날짜별 의사 목록 저장
 */
export function setCachedDoctorsByDate(date: string, data: DoctorsByDateData): void {
  const key = getDoctorsByDateKey(date)
  doctorsByDateCache.set(key, {
    data,
    expireAt: Date.now() + SLOT_CACHE_TTL
  })
}

/**
 * 스케줄 템플릿 가져오기
 */
export function getCachedSchedule<T>(doctorId: string, dayOfWeek: number): T | null {
  const key = getScheduleKey(doctorId, dayOfWeek)
  const entry = scheduleTemplateCache.get(key)
  
  if (entry && entry.expireAt > Date.now()) {
    return entry.data as T
  }
  
  if (entry) {
    scheduleTemplateCache.delete(key)
  }
  
  return null
}

/**
 * 스케줄 템플릿 저장
 */
export function setCachedSchedule(doctorId: string, dayOfWeek: number, data: unknown): void {
  const key = getScheduleKey(doctorId, dayOfWeek)
  scheduleTemplateCache.set(key, {
    data,
    expireAt: Date.now() + SCHEDULE_CACHE_TTL
  })
}

/**
 * 특정 의사+날짜 슬롯 캐시 무효화
 * (예약 생성/취소/상태변경 시 호출)
 */
export function invalidateSlotCache(doctorId: string, date: string): void {
  const slotKey = getSlotCacheKey(doctorId, date)
  slotCache.delete(slotKey)
  
  // 해당 날짜의 의사 목록 캐시도 무효화
  const doctorsKey = getDoctorsByDateKey(date)
  doctorsByDateCache.delete(doctorsKey)
}

/**
 * 특정 날짜의 모든 슬롯 캐시 무효화
 */
export function invalidateDateCache(date: string): void {
  const doctorsKey = getDoctorsByDateKey(date)
  doctorsByDateCache.delete(doctorsKey)
  
  // 해당 날짜 관련 슬롯 캐시 모두 삭제
  for (const key of slotCache.keys()) {
    if (key.includes(`:${date}`)) {
      slotCache.delete(key)
    }
  }
}

/**
 * 모든 캐시 초기화
 */
export function clearAllCache(): void {
  slotCache.clear()
  doctorsByDateCache.clear()
  scheduleTemplateCache.clear()
}

/**
 * 만료된 캐시 정리 (주기적으로 호출)
 */
export function cleanupExpiredCache(): void {
  const now = Date.now()
  
  for (const [key, entry] of slotCache.entries()) {
    if (entry.expireAt <= now) {
      slotCache.delete(key)
    }
  }
  
  for (const [key, entry] of doctorsByDateCache.entries()) {
    if (entry.expireAt <= now) {
      doctorsByDateCache.delete(key)
    }
  }
  
  for (const [key, entry] of scheduleTemplateCache.entries()) {
    if (entry.expireAt <= now) {
      scheduleTemplateCache.delete(key)
    }
  }
}

// 5분마다 만료된 캐시 정리
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 300000)
}

/**
 * 캐시 상태 확인 (디버깅용)
 */
export function getCacheStats() {
  return {
    slotCacheSize: slotCache.size,
    doctorsByDateCacheSize: doctorsByDateCache.size,
    scheduleCacheSize: scheduleTemplateCache.size,
  }
}




