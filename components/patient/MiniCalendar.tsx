'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CalendarDay {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  markers: ('period' | 'visit' | 'relation' | 'memo')[]
}

export default function MiniCalendar() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate())

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // 월요일 시작으로 변환
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = []
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)

    // 이전 달 날짜
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        markers: [],
      })
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = 
        i === today.getDate() && 
        currentMonth === today.getMonth() && 
        currentYear === today.getFullYear()
      
      // 예시 마커 데이터 (실제로는 API에서 가져와야 함)
      const markers: ('period' | 'visit' | 'relation' | 'memo')[] = []
      if (i === 3 || i === 4) markers.push('period')
      if (i === 6 || i === 7) markers.push('relation')
      if (i === 11) markers.push('visit')
      if (i === 12 || i === 19) markers.push('memo')

      days.push({
        date: i,
        isCurrentMonth: true,
        isToday,
        isSelected: i === selectedDate && currentMonth === today.getMonth(),
        markers,
      })
    }

    // 다음 달 날짜 (6주 채우기)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        markers: [],
      })
    }

    return days
  }

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

  const handleDateClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date)
    }
  }

  const calendarDays = generateCalendarDays()

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPrevMonth} className="p-2 hover:bg-[#E8F5F2] rounded-lg transition-colors">
          <svg className="w-5 h-5 text-[#636E72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-[#2D3436]">
          {currentYear}년 {monthNames[currentMonth]}
        </h3>
        <button onClick={goToNextMonth} className="p-2 hover:bg-[#E8F5F2] rounded-lg transition-colors">
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
          const isSaturday = idx % 7 === 5
          const isSunday = idx % 7 === 6

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(day)}
              disabled={!day.isCurrentMonth}
              className={`flex flex-col items-center justify-center h-12 rounded-full transition-all ${
                day.isSelected
                  ? 'bg-[#5B9A8B] text-white'
                  : day.isToday
                  ? 'border-2 border-[#5B9A8B] text-[#5B9A8B]'
                  : day.isCurrentMonth
                  ? isSunday
                    ? 'text-[#E57373] hover:bg-[#E8F5F2]'
                    : isSaturday
                    ? 'text-[#5B9A8B] hover:bg-[#E8F5F2]'
                    : 'text-[#2D3436] hover:bg-[#E8F5F2]'
                  : 'text-[#DFE6E9]'
              }`}
            >
              <span className="text-sm">{day.date}</span>
              {/* 마커 */}
              {day.markers.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {day.markers.slice(0, 3).map((marker, mIdx) => (
                    <div
                      key={mIdx}
                      className={`w-1 h-1 rounded-full ${
                        marker === 'period' ? 'bg-[#E57373]' :
                        marker === 'visit' ? 'bg-[#5B9A8B]' :
                        marker === 'relation' ? 'bg-[#E9B171]' :
                        'bg-[#B2BEC3]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#DFE6E9]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#E57373]" />
          <span className="text-xs text-[#636E72]">생리기간</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#5B9A8B]" />
          <span className="text-xs text-[#636E72]">내원일</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#E9B171]" />
          <span className="text-xs text-[#636E72]">관계</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#B2BEC3]" />
          <span className="text-xs text-[#636E72]">메모</span>
        </div>
      </div>

      {/* 예약하기 링크 */}
      <Link
        href="/reserve"
        className="block mt-4 text-center text-[#5B9A8B] font-medium hover:underline"
      >
        선택한 날짜에 예약하기 →
      </Link>
    </div>
  )
}


