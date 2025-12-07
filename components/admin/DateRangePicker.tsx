'use client'

import { useState, useEffect, useRef } from 'react'
import { formatLocalDate } from '@/lib/dateUtils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectingStart, setSelectingStart] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 달력 데이터 생성
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    // 이전 달의 빈 날짜
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // 현재 달의 날짜
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateToString = (date: Date) => {
    return formatLocalDate(date)
  }

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false
    const d = formatDateToString(date)
    return d >= startDate && d <= endDate
  }

  const isStartDate = (date: Date) => {
    return startDate && formatDateToString(date) === startDate
  }

  const isEndDate = (date: Date) => {
    return endDate && formatDateToString(date) === endDate
  }

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateToString(date)
    
    if (selectingStart) {
      onStartDateChange(dateStr)
      if (endDate && dateStr > endDate) {
        onEndDateChange('')
      }
      setSelectingStart(false)
    } else {
      if (dateStr < startDate) {
        onStartDateChange(dateStr)
        onEndDateChange(startDate)
      } else {
        onEndDateChange(dateStr)
      }
      setSelectingStart(true)
      setIsOpen(false)
    }
  }

  const handlePreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    onStartDateChange(formatDateToString(start))
    onEndDateChange(formatDateToString(end))
    setIsOpen(false)
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div ref={containerRef} className="relative">
      {/* 선택된 기간 표시 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-[#0066CC] transition-colors min-w-[280px]"
      >
        <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm">
          {startDate && endDate ? (
            <span className="text-[#1E293B]">
              {formatDate(startDate)} ~ {formatDate(endDate)}
            </span>
          ) : (
            <span className="text-gray-400">기간을 선택하세요</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 달력 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* 빠른 선택 버튼 */}
          <div className="p-3 border-b border-gray-100 flex flex-wrap gap-2">
            <button
              onClick={() => handlePreset(7)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-[#E8F4FD] text-gray-600 hover:text-[#0066CC] rounded-full transition-colors"
            >
              최근 7일
            </button>
            <button
              onClick={() => handlePreset(14)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-[#E8F4FD] text-gray-600 hover:text-[#0066CC] rounded-full transition-colors"
            >
              최근 14일
            </button>
            <button
              onClick={() => handlePreset(30)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-[#E8F4FD] text-gray-600 hover:text-[#0066CC] rounded-full transition-colors"
            >
              최근 30일
            </button>
            <button
              onClick={() => handlePreset(90)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-[#E8F4FD] text-gray-600 hover:text-[#0066CC] rounded-full transition-colors"
            >
              최근 90일
            </button>
          </div>

          {/* 선택 안내 */}
          <div className="px-4 py-2 bg-[#F0F9FF] border-b border-gray-100">
            <p className="text-xs text-[#0066CC] font-medium">
              {selectingStart ? '📅 시작일을 선택하세요' : '📅 종료일을 선택하세요'}
            </p>
          </div>

          {/* 달력 헤더 */}
          <div className="p-3 flex items-center justify-between border-b border-gray-100">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-semibold text-[#1E293B]">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-medium ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 p-2">
            {days.map((date, i) => (
              <div key={i} className="aspect-square p-0.5">
                {date ? (
                  <button
                    onClick={() => handleDateClick(date)}
                    className={`w-full h-full flex items-center justify-center text-sm rounded-lg transition-all ${
                      isStartDate(date) || isEndDate(date)
                        ? 'bg-[#0066CC] text-white font-semibold'
                        : isDateInRange(date)
                        ? 'bg-[#E8F4FD] text-[#0066CC]'
                        : date.getDay() === 0
                        ? 'text-red-400 hover:bg-gray-100'
                        : date.getDay() === 6
                        ? 'text-blue-400 hover:bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>

          {/* 선택된 기간 표시 */}
          {startDate && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">선택:</span>
                  <span className="font-medium text-[#1E293B]">{formatDate(startDate)}</span>
                  {endDate && (
                    <>
                      <span className="text-gray-400">~</span>
                      <span className="font-medium text-[#1E293B]">{formatDate(endDate)}</span>
                    </>
                  )}
                </div>
                {startDate && endDate && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 bg-[#0066CC] text-white text-xs font-medium rounded-lg hover:bg-[#0052A3] transition-colors"
                  >
                    적용
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

