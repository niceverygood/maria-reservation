import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 클래스명 병합 유틸리티
 * Tailwind CSS 클래스 충돌 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 전화번호 포맷팅
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
  }
  if (phone.length === 10) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
  }
  return phone
}

/**
 * 생년월일 포맷팅
 */
export function formatBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate || birthDate.length !== 8) return '-'
  return `${birthDate.slice(0, 4)}.${birthDate.slice(4, 6)}.${birthDate.slice(6, 8)}`
}

/**
 * 예약 상태 라벨
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return '대기'
    case 'BOOKED': return '확정'
    case 'COMPLETED': return '완료'
    case 'CANCELLED': return '취소'
    case 'REJECTED': return '거절'
    case 'NO_SHOW': return '노쇼'
    default: return status
  }
}

/**
 * 예약 상태 스타일
 */
export function getStatusStyle(status: string): string {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-700'
    case 'BOOKED': return 'bg-blue-100 text-blue-700'
    case 'COMPLETED': return 'bg-green-100 text-green-700'
    case 'CANCELLED': return 'bg-gray-100 text-gray-600'
    case 'REJECTED': return 'bg-red-100 text-red-700'
    case 'NO_SHOW': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

/**
 * 날짜 한국어 포맷
 */
export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
}

/**
 * 짧은 날짜 포맷
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 쓰로틀 함수
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 숫자 포맷팅 (천 단위 콤마)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR')
}

/**
 * 빈 값 체크
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 배열 청크 분할
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}




