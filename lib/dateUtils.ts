/**
 * 날짜 유틸리티 함수들
 * toISOString()은 UTC로 변환하여 한국시간(UTC+9)에서 날짜가 밀리는 문제가 있음
 * 로컬 시간 기반으로 날짜 문자열을 생성하는 함수들
 */

/**
 * Date 객체를 YYYY-MM-DD 형식의 로컬 날짜 문자열로 변환
 * @param date Date 객체
 * @returns YYYY-MM-DD 형식 문자열
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns 오늘 날짜 문자열
 */
export function getTodayString(): string {
  return formatLocalDate(new Date())
}

/**
 * 날짜 문자열을 한국어 형식으로 변환
 * @param dateStr YYYY-MM-DD 형식 문자열
 * @returns "M월 D일 (요일)" 형식
 */
export function formatDateKorean(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  return `${month}월 ${day}일 (${weekDays[date.getDay()]})`
}

/**
 * 날짜 문자열에서 Date 객체 생성 (로컬 타임존 기준)
 * @param dateStr YYYY-MM-DD 형식 문자열
 * @returns Date 객체
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 두 날짜가 같은 날인지 비교
 * @param date1 Date 객체 또는 YYYY-MM-DD 문자열
 * @param date2 Date 객체 또는 YYYY-MM-DD 문자열
 * @returns 같은 날이면 true
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const str1 = typeof date1 === 'string' ? date1 : formatLocalDate(date1)
  const str2 = typeof date2 === 'string' ? date2 : formatLocalDate(date2)
  return str1 === str2
}

/**
 * 특정 월의 시작일과 종료일 반환
 * @param year 연도
 * @param month 월 (1-12)
 * @returns { startDate, endDate }
 */
export function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

