'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/contexts/RealtimeContext'
import { formatLocalDate, getTodayString, formatDateKorean } from '@/lib/dateUtils'
import { useWebSocket } from '@/lib/ws/useWebSocket'

interface Doctor {
  id: string
  name: string
  department: string
}

interface Patient {
  id: string
  name: string
  birthDate: string
  phone: string
}

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  memo: string | null
  doctor: Doctor
  patient: Patient
}

interface DateCount {
  total: number
  pending: number
  booked: number
  completed: number
  cancelled: number
  rejected: number
  noShow: number
}

type ViewMode = 'calendar' | 'list'

export default function AdminReservationsPage() {
  const router = useRouter()
  const { refreshTrigger } = useRealtime()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // 캘린더 상태
  const today = new Date()
  const todayStr = getTodayString()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [dateCounts, setDateCounts] = useState<Record<string, DateCount>>({})
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  // 필터
  const [filters, setFilters] = useState({
    date: todayStr,
    doctorId: '',
    status: '',
    search: '',
  })

  // 의사 목록 불러오기
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
        }
      } catch (error) {
        console.error('의사 목록 조회 오류:', error)
      }
    }
    fetchDoctors()
  }, [])

  // 날짜별 예약 건수 불러오기
  const fetchDateCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/appointments/count-by-date?year=${currentYear}&month=${currentMonth}`)
      const data = await res.json()
      if (data.success) {
        setDateCounts(data.counts)
      }
    } catch (error) {
      console.error('날짜별 예약 건수 조회 오류:', error)
    }
  }, [currentYear, currentMonth])

  useEffect(() => {
    fetchDateCounts()
  }, [fetchDateCounts, refreshTrigger])

  // 예약 목록 불러오기
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true)
    try {
      const dateToFetch = viewMode === 'calendar' ? selectedDate : filters.date
      const params = new URLSearchParams()
      if (dateToFetch) params.append('date', dateToFetch)
      if (filters.doctorId) params.append('doctorId', filters.doctorId)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`/api/admin/appointments?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('예약 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, selectedDate, viewMode, router])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments, refreshTrigger])

  // WebSocket 실시간 동기화
  const { isConnected } = useWebSocket({
    onNewAppointment: (payload) => {
      console.log('🔔 새 예약 수신:', payload)
      // 현재 선택된 날짜와 같으면 목록에 추가, 아니면 달력만 업데이트
      fetchDateCounts()
      if (payload?.date === selectedDate) {
        fetchAppointments()
      }
    },
    onCancelAppointment: (payload) => {
      console.log('❌ 예약 취소 수신:', payload)
      if (payload?.id) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: 'CANCELLED' } : apt)
        )
        fetchDateCounts()
      }
    },
    onStatusUpdate: (payload) => {
      console.log('🔄 상태 변경 수신:', payload)
      if (payload?.id && payload?.status) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: payload.status as string } : apt)
        )
        fetchDateCounts()
      }
    },
    onReschedule: (payload) => {
      console.log('📝 예약 변경 수신:', payload)
      fetchDateCounts()
      fetchAppointments()
    },
  })

  useEffect(() => {
    setWsConnected(isConnected)
  }, [isConnected])

  // 상태 변경 핸들러
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (data.success) {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: newStatus } : apt
          )
        )
        // 달력 건수도 즉시 업데이트
        fetchDateCounts()
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  // 캘린더 데이터 계산
  const calendarDays = useMemo(() => {
    const days: { date: Date | null; isCurrentMonth: boolean }[] = []
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // 월요일 시작

    // 이전 달
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate()
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(currentYear, currentMonth - 2, prevMonthDays - i), isCurrentMonth: false })
    }

    // 현재 달
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(currentYear, currentMonth - 1, i), isCurrentMonth: true })
    }

    // 다음 달 (6주 채우기)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(currentYear, currentMonth, i), isCurrentMonth: false })
    }

    return days
  }, [currentYear, currentMonth])

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateClick = (date: Date) => {
    const dateStr = formatLocalDate(date)
    setSelectedDate(dateStr)
    setFilters(prev => ({ ...prev, date: dateStr }))
  }

  const getStatusStyle = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  // 예약 승인 핸들러
  const handleApprove = async (appointmentId: string) => {
    if (!confirm('이 예약을 확정하시겠습니까?')) return
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'BOOKED' } : apt))
        // 달력 건수도 즉시 업데이트
        fetchDateCounts()
        alert('예약이 확정되었습니다.')
      } else {
        alert(data.error || '승인 실패')
      }
    } catch (error) {
      console.error('승인 오류:', error)
      alert('승인 중 오류가 발생했습니다.')
    } finally {
      setStatusUpdating(null)
    }
  }

  // 예약 거절 핸들러
  const handleReject = async (appointmentId: string) => {
    const reason = prompt('거절 사유를 입력하세요 (선택사항):')
    if (reason === null) return // 취소 클릭
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (data.success) {
        setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'REJECTED' } : apt))
        // 달력 건수도 즉시 업데이트
        fetchDateCounts()
        alert('예약이 거절되었습니다.')
      } else {
        alert(data.error || '거절 실패')
      }
    } catch (error) {
      console.error('거절 오류:', error)
      alert('거절 중 오류가 발생했습니다.')
    } finally {
      setStatusUpdating(null)
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    }
    return phone
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">예약 관리</h1>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'calendar' ? 'bg-white shadow text-[#0066CC]' : 'text-gray-600'
              }`}
            >
              📅 캘린더
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white shadow text-[#0066CC]' : 'text-gray-600'
              }`}
            >
              📋 목록
            </button>
          </div>
          <Link href="/admin/reservations/new" className="btn-primary text-sm">
            + 새 예약
          </Link>
        </div>
      </div>

      {/* 색상 범례 */}
      {viewMode === 'calendar' && (
        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">상태:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-400"></span>
            <span className="text-xs text-gray-600">대기</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span className="text-xs text-gray-600">확정</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span className="text-xs text-gray-600">완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-400"></span>
            <span className="text-xs text-gray-600">취소</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-400"></span>
            <span className="text-xs text-gray-600">거절</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-500"></span>
            <span className="text-xs text-gray-600">노쇼</span>
          </div>
        </div>
      )}

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* 캘린더 */}
          <div className="flex-1 min-w-0 card">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-[#1E293B]">
                {currentYear}년 {monthNames[currentMonth - 1]}
              </h2>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map((day, idx) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${
                  idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day.date) return <div key={idx} />

                const dateStr = formatLocalDate(day.date)
                const count = dateCounts[dateStr]
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === todayStr
                const isSaturday = idx % 7 === 5
                const isSunday = idx % 7 === 6

                return (
                  <button
                    key={idx}
                    onClick={() => day.isCurrentMonth && handleDateClick(day.date!)}
                    disabled={!day.isCurrentMonth}
                    className={`
                      relative p-2 min-h-[70px] rounded-lg text-left transition-all
                      ${!day.isCurrentMonth ? 'opacity-30' : 'hover:bg-gray-50'}
                      ${isSelected ? 'bg-[#0066CC]/10 ring-2 ring-[#0066CC]' : ''}
                      ${isToday && !isSelected ? 'bg-yellow-50' : ''}
                    `}
                  >
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-[#0066CC]' : 
                      isSunday ? 'text-red-500' : 
                      isSaturday ? 'text-blue-500' : 'text-gray-700'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    
                    {count && count.total > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {/* 대기 - 노란색 */}
                        {count.pending > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-400 text-white">
                            {count.pending}
                          </span>
                        )}
                        {/* 확정 - 파란색 */}
                        {count.booked > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-500 text-white">
                            {count.booked}
                          </span>
                        )}
                        {/* 완료 - 초록색 */}
                        {count.completed > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-green-500 text-white">
                            {count.completed}
                          </span>
                        )}
                        {/* 취소 - 회색 */}
                        {count.cancelled > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-gray-400 text-white">
                            {count.cancelled}
                          </span>
                        )}
                        {/* 거절 - 빨간색 */}
                        {count.rejected > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-red-400 text-white">
                            {count.rejected}
                          </span>
                        )}
                        {/* 노쇼 - 보라색 */}
                        {count.noShow > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-purple-500 text-white">
                            {count.noShow}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 선택된 날짜의 예약 목록 */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0 card">
            <h3 className="font-bold text-[#1E293B] mb-4">
              📅 {formatDateKorean(selectedDate)}
            </h3>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {appointments.map((apt) => (
                  <div key={apt.id} className={`p-3 rounded-lg ${
                    apt.status === 'PENDING' ? 'bg-yellow-50 border border-yellow-200' : 
                    apt.status === 'BOOKED' ? 'bg-blue-50 border border-blue-200' :
                    apt.status === 'COMPLETED' ? 'bg-green-50 border border-green-200' :
                    apt.status === 'CANCELLED' ? 'bg-gray-100 border border-gray-200' :
                    apt.status === 'REJECTED' ? 'bg-red-50 border border-red-200' :
                    apt.status === 'NO_SHOW' ? 'bg-orange-50 border border-orange-200' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#1E293B]">{apt.time}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1E293B] font-medium">{apt.patient.name}</p>
                    <p className="text-xs text-gray-500">{apt.doctor.name} · {apt.doctor.department}</p>
                    {apt.patient.phone && (
                      <p className="text-xs text-gray-400 mt-1">{formatPhone(apt.patient.phone)}</p>
                    )}
                    
                    {/* PENDING 상태: 확정/거절 버튼 */}
                    {apt.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApprove(apt.id)}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          ✓ 확정
                        </button>
                        <button
                          onClick={() => handleReject(apt.id)}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                        >
                          ✕ 거절
                        </button>
                      </div>
                    )}
                    
                    {/* BOOKED 상태: 완료/노쇼/취소 버튼 */}
                    {apt.status === 'BOOKED' && (
                      <div className="mt-3 flex gap-1">
                        <button
                          onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          ✓ 완료
                        </button>
                        <button
                          onClick={() => handleStatusChange(apt.id, 'NO_SHOW')}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                          노쇼
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('예약을 취소하시겠습니까?')) {
                              handleStatusChange(apt.id, 'CANCELLED')
                            }
                          }}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    )}

                    {/* 완료/취소/노쇼 상태는 읽기 전용 */}
                    {['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(apt.status) && (
                      <div className="mt-2 text-xs text-gray-400 text-center">
                        {apt.status === 'COMPLETED' && '진료 완료됨'}
                        {apt.status === 'CANCELLED' && '취소됨'}
                        {apt.status === 'REJECTED' && '거절됨'}
                        {apt.status === 'NO_SHOW' && '미방문 처리됨'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                예약이 없습니다
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
              총 {appointments.length}건
            </div>
          </div>
        </div>
      )}

      {/* 목록 뷰 */}
      {viewMode === 'list' && (
        <>
          {/* 필터 */}
          <div className="card mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">날짜</label>
                <input
                  type="date"
                  className="input-field text-sm py-2"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">의사</label>
                <select
                  className="input-field text-sm py-2"
                  value={filters.doctorId}
                  onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}
                >
                  <option value="">전체</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">상태</label>
                <select
                  className="input-field text-sm py-2"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">전체</option>
                  <option value="PENDING">대기</option>
                  <option value="BOOKED">확정</option>
                  <option value="COMPLETED">완료</option>
                  <option value="CANCELLED">취소</option>
                  <option value="REJECTED">거절</option>
                  <option value="NO_SHOW">노쇼</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">검색</label>
                <input
                  type="text"
                  className="input-field text-sm py-2"
                  placeholder="환자명 또는 전화번호"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* 예약 목록 */}
          <div className="card">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-[#64748B]">로딩 중...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">시간</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">환자명</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden md:table-cell">연락처</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">의사</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id} className={`border-b border-gray-50 ${
                        appointment.status === 'PENDING' ? 'bg-yellow-50' : 'hover:bg-gray-50'
                      }`}>
                        <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{appointment.time}</td>
                        <td className="py-3 px-2 text-sm text-[#1E293B]">{appointment.patient.name}</td>
                        <td className="py-3 px-2 text-sm text-[#64748B] hidden md:table-cell">{formatPhone(appointment.patient.phone || '')}</td>
                        <td className="py-3 px-2 text-sm text-[#64748B]">{appointment.doctor.name}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            {/* PENDING: 확정/거절 */}
                            {appointment.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(appointment.id)}
                                  disabled={statusUpdating === appointment.id}
                                  className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                  확정
                                </button>
                                <button
                                  onClick={() => handleReject(appointment.id)}
                                  disabled={statusUpdating === appointment.id}
                                  className="px-2 py-1 text-xs font-medium bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                                >
                                  거절
                                </button>
                              </>
                            )}
                            {/* BOOKED: 완료/노쇼/취소 */}
                            {appointment.status === 'BOOKED' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                                  disabled={statusUpdating === appointment.id}
                                  className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                  완료
                                </button>
                                <button
                                  onClick={() => handleStatusChange(appointment.id, 'NO_SHOW')}
                                  disabled={statusUpdating === appointment.id}
                                  className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                                >
                                  노쇼
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('취소하시겠습니까?')) handleStatusChange(appointment.id, 'CANCELLED')
                                  }}
                                  disabled={statusUpdating === appointment.id}
                                  className="px-2 py-1 text-xs font-medium bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                                >
                                  취소
                                </button>
                              </>
                            )}
                            {/* 완료/취소된 상태 */}
                            {['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(appointment.status) && (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748B]">
                검색 조건에 맞는 예약이 없습니다.
              </div>
            )}

            <div className="mt-4 text-sm text-[#64748B]">
              총 {appointments.length}건
            </div>
          </div>
        </>
      )}
    </div>
  )
}
