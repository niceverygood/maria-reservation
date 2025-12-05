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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // 월요일 시작으로 변환
  }

  const calendarDays = useMemo(() => {
    const days: { date: Date | null; isCurrentMonth: boolean }[] = []
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)

    // 이전 달 날짜
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthDays - i)
      days.push({ date, isCurrentMonth: false })
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({ date, isCurrentMonth: true })
    }

    // 다음 달 날짜 (6주 채우기)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      days.push({ date, isCurrentMonth: false })
    }

    return days
  }, [currentMonth, currentYear])

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    const selected = new Date(selectedDate)
    return date.toDateString() === selected.toDateString()
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const handleDateClick = (date: Date | null, isCurrentMonth: boolean) => {
    if (!date || !isCurrentMonth || isDateDisabled(date)) return
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    onSelectDate(`${year}-${month}-${day}`)
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={goToPrevMonth} 
          className="p-2 hover:bg-[#E8F5F2] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-[#636E72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-[#2D3436]">
          {currentYear}년 {monthNames[currentMonth]}
        </h3>
        <button 
          onClick={goToNextMonth} 
          className="p-2 hover:bg-[#E8F5F2] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-[#636E72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map((day, idx) => (
          <div 
            key={day} 
            className={`text-center text-sm font-medium py-2 ${
              idx === 5 ? 'text-[#5B9A8B]' : idx === 6 ? 'text-[#E57373]' : 'text-[#636E72]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((day, idx) => {
          if (!day.date) return <div key={idx} className="h-10" />

          const disabled = !day.isCurrentMonth || isDateDisabled(day.date)
          const selected = isDateSelected(day.date)
          const todayDate = isToday(day.date)
          const isSaturday = idx % 7 === 5
          const isSunday = idx % 7 === 6

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
              disabled={disabled}
              className={`
                h-10 w-10 mx-auto flex items-center justify-center rounded-full text-sm
                transition-all
                ${selected
                  ? 'bg-[#5B9A8B] text-white font-bold'
                  : todayDate
                  ? 'border-2 border-[#5B9A8B] text-[#5B9A8B] font-bold'
                  : disabled
                  ? 'text-[#DFE6E9] cursor-not-allowed'
                  : isSunday
                  ? 'text-[#E57373] hover:bg-[#E8F5F2]'
                  : isSaturday
                  ? 'text-[#5B9A8B] hover:bg-[#E8F5F2]'
                  : 'text-[#2D3436] hover:bg-[#E8F5F2]'
                }
              `}
            >
              {day.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
