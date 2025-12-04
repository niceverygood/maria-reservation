'use client'

import { useState, useMemo } from 'react'

interface CalendarProps {
  selectedDate: string | null
  onSelectDate: (date: string) => void
  minDate?: Date
  maxDate?: Date
}

export default function Calendar({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // 오늘 날짜
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // 현재 월의 달력 데이터 생성
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 첫째 날의 요일 (0: 일요일)
    const startDayOfWeek = firstDay.getDay()
    
    // 캘린더에 표시할 날짜 배열
    const days: (Date | null)[] = []
    
    // 이전 달의 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // 현재 달의 날짜
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [currentMonth])

  // 날짜 포맷 (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  // 날짜 선택 가능 여부
  const isDateSelectable = (date: Date): boolean => {
    if (date < today) return false
    if (minDate && date < minDate) return false
    if (maxDate && date > maxDate) return false
    return true
  }

  // 이전/다음 달로 이동
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // 이전 달 버튼 비활성화 여부
  const isPrevDisabled = useMemo(() => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0)
    return prevMonthEnd < today
  }, [currentMonth, today])

  // 다음 달 버튼 비활성화 여부
  const isNextDisabled = useMemo(() => {
    if (!maxDate) return false
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return nextMonth > maxDate
  }, [currentMonth, maxDate])

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="w-full">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          disabled={isPrevDisabled}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-[#1E293B]">
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button
          onClick={goToNextMonth}
          disabled={isNextDisabled}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateString = formatDate(date)
          const isSelected = selectedDate === dateString
          const isToday = formatDate(date) === formatDate(today)
          const isSelectable = isDateSelectable(date)
          const dayOfWeek = date.getDay()

          return (
            <button
              key={dateString}
              onClick={() => isSelectable && onSelectDate(dateString)}
              disabled={!isSelectable}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                ${isSelected
                  ? 'bg-[#0066CC] text-white font-bold'
                  : isToday
                  ? 'bg-[#E8F4FD] text-[#0066CC] font-semibold'
                  : isSelectable
                  ? 'hover:bg-gray-100 text-gray-900'
                  : 'text-gray-300 cursor-not-allowed'
                }
                ${!isSelected && isSelectable && dayOfWeek === 0 ? 'text-red-500' : ''}
                ${!isSelected && isSelectable && dayOfWeek === 6 ? 'text-blue-500' : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* 안내 문구 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#E8F4FD]" />
          <span>오늘</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#0066CC]" />
          <span>선택됨</span>
        </div>
      </div>
    </div>
  )
}

