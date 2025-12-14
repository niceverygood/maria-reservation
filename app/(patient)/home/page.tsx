'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { formatLocalDate, getTodayString } from '@/lib/dateUtils'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  doctor: {
    id: string
    name: string
    department: string
    position?: string
  }
}

interface PatientInfo {
  name: string
  phone: string
}

export default function HomePage() {
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())

  const todayStr = getTodayString()

  // 캘린더 데이터 생성 (월요일 시작)
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    
    // 월요일 시작으로 변환 (0=일요일 -> 6, 1=월요일 -> 0, ...)
    let startPadding = firstDay.getDay() - 1
    if (startPadding < 0) startPadding = 6

    for (let i = 0; i < startPadding; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }
    return days
  }, [currentYear, currentMonth])

  // 예약 있는 날짜 맵
  const appointmentDates = useMemo(() => {
    const map = new Map<string, string>()
    appointments.forEach(apt => {
      map.set(apt.date, apt.status)
    })
    return map
  }, [appointments])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [authRes, appointmentsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/patient/appointments/my')
        ])

        const authData = await authRes.json()
        if (authData.success && authData.patient) {
          setPatientInfo({
            name: authData.patient.name || '고객',
            phone: authData.patient.phone
          })
        }

        const appointmentsData = await appointmentsRes.json()
        if (appointmentsData.success) {
          setAppointments(appointmentsData.appointments || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 선택된 날짜의 예약
  const selectedAppointment = appointments.find(apt => apt.date === selectedDate)

  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="px-5 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* 환영 메시지 */}
      <div className="px-5 py-6 bg-[#F8FAF9]">
        <h1 className="text-2xl font-bold text-[#2D3436]">
          {patientInfo?.name || '고객'}님,
        </h1>
        <p className="text-[#636E72] mt-1">
          기적 같은 순간을 위해 최선을 다하겠습니다.
        </p>
      </div>

      {/* 캘린더 섹션 */}
      <div className="px-5 py-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-[#2D3436]">
              {currentYear}년 {currentMonth + 1}월
            </h3>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day, idx) => (
              <div 
                key={day} 
                className={`text-center text-xs font-medium py-2 ${
                  idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-10" />
              
              const dateStr = formatLocalDate(date)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasAppointment = appointmentDates.has(dateStr)
              const dayOfWeek = date.getDay()
              const isSaturday = dayOfWeek === 6
              const isSunday = dayOfWeek === 0

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className="h-10 flex flex-col items-center justify-center relative"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
                    ${isSelected ? 'bg-[#2D3436] text-white' : ''}
                    ${!isSelected && isToday ? 'border-2 border-[#5B9A8B]' : ''}
                    ${!isSelected && !isToday ? 'hover:bg-gray-100' : ''}
                  `}>
                    <span className={`
                      ${isSelected ? 'text-white' : ''}
                      ${!isSelected && isSaturday ? 'text-blue-500' : ''}
                      ${!isSelected && isSunday ? 'text-red-500' : ''}
                      ${!isSelected && !isSaturday && !isSunday ? 'text-gray-700' : ''}
                    `}>
                      {date.getDate().toString().padStart(2, '0')}
                    </span>
                  </div>
                  {/* 예약 마커 */}
                  {hasAppointment && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[#5B9A8B]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-gray-500">생리기간</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5B9A8B]" />
              <span className="text-xs text-gray-500">내원일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-500">관계</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-500">메모</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메모 섹션 */}
      <div className="px-5 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#2D3436]">메모</h2>
          <button className="flex items-center gap-1 text-[#5B9A8B] text-sm font-medium">
            <span>+</span>
            <span>추가하기</span>
          </button>
        </div>

        {/* 메모 카드 */}
        <div className="bg-[#F8FAF9] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-500">내원일</span>
                <span className="text-xs text-gray-400">{selectedDate}</span>
              </div>
              <p className="text-sm text-[#2D3436]">내원일 기록</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 담당의 섹션 */}
      <div className="px-5 py-4">
        <h2 className="text-lg font-bold text-[#2D3436] mb-3">담당의</h2>
        
        <div className="bg-[#F8FAF9] rounded-xl p-4">
          {/* 담당의 정보 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#2D3436]">
                  {selectedAppointment?.doctor?.name || '신소현'} {selectedAppointment?.doctor?.position || '부장'}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedAppointment?.doctor?.department || '일산마리아병원'}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-sm text-gray-500">
              상담 기록 보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 1:1 상담하기 버튼 */}
          <Link 
            href="/reserve"
            className="w-full flex items-center justify-center gap-2 bg-[#5B9A8B] text-white py-3.5 rounded-xl font-medium hover:bg-[#4A8577] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            1:1 상담하기
          </Link>
        </div>

        {/* 전화예약 / 카톡예약 버튼 */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <a 
            href="tel:031-000-0000"
            className="flex flex-col items-center gap-2 py-4 bg-white border border-gray-200 rounded-xl hover:border-[#5B9A8B] transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm text-gray-700">전화예약</span>
          </a>
          <a 
            href="https://pf.kakao.com/_xjxkxkxj"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 py-4 bg-white border border-gray-200 rounded-xl hover:border-[#5B9A8B] transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm text-gray-700">카톡예약</span>
          </a>
        </div>

        {/* 다른 분원 예약하기 */}
        <button className="w-full flex items-center justify-center gap-1 mt-4 py-2 text-sm text-gray-500">
          다른 분원 예약하기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

