'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRealtime } from '@/contexts/RealtimeContext'
import { formatLocalDate, getTodayString, formatDateKorean } from '@/lib/dateUtils'
import { useWebSocket } from '@/lib/ws/useWebSocket'

// Suspense wrapper를 위한 컴포넌트
function ReservationsContent() {
  return <AdminReservationsPageContent />
}

export default function AdminReservationsPage() {
  return (
    <Suspense fallback={
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    }>
      <ReservationsContent />
    </Suspense>
  )
}

interface Doctor {
  id: string
  name: string
  department: string
  isActive?: boolean
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
  emrSynced?: boolean
  emrSyncedAt?: string
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

type ViewMode = 'calendar' | 'list' | 'timeline'

// 캐시 저장소
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 30000 // 30초

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

function clearCache() {
  cache.clear()
}

function AdminReservationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const { refreshTrigger } = useRealtime()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId)
  const [allFilters, setAllFilters] = useState({
    doctorId: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  })

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

  // 마지막 갱신 시간
  const lastRefresh = useRef<number>(0)
  const highlightRef = useRef<HTMLDivElement>(null)

  // highlight 파라미터가 있으면 해당 예약 정보 조회 후 날짜로 이동
  useEffect(() => {
    if (highlightId) {
      const fetchHighlightedAppointment = async () => {
        try {
          const res = await fetch(`/api/admin/appointments/${highlightId}`)
          const data = await res.json()
          if (data.success && data.appointment) {
            const aptDate = data.appointment.date
            setSelectedDate(aptDate)
            setFilters(prev => ({ ...prev, date: aptDate }))
            
            // 해당 월로 캘린더 이동
            const [year, month] = aptDate.split('-').map(Number)
            setCurrentYear(year)
            setCurrentMonth(month)
            setHighlightedId(highlightId)
          }
        } catch (error) {
          console.error('예약 정보 조회 오류:', error)
        }
      }
      fetchHighlightedAppointment()
    }
  }, [highlightId])

  // 하이라이트된 예약으로 스크롤
  useEffect(() => {
    if (highlightedId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [highlightedId, appointments])

  // 5초 후 하이라이트 해제
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        setHighlightedId(null)
        // URL에서 highlight 파라미터 제거
        router.replace('/admin/reservations', { scroll: false })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [highlightedId, router])

  // 초기 데이터 로드 (의사 목록 + 날짜별 건수 병렬 로드)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [doctorsRes, countsRes] = await Promise.all([
          fetch('/api/patient/doctors'),
          fetch(`/api/admin/appointments/count-by-date?year=${currentYear}&month=${currentMonth}`),
        ])

        const [doctorsData, countsData] = await Promise.all([
          doctorsRes.json(),
          countsRes.json(),
        ])

        if (doctorsData.success) {
          setDoctors(doctorsData.doctors)
        }
        if (countsData.success) {
          setDateCounts(countsData.counts)
        }
      } catch (error) {
        console.error('초기 데이터 로드 오류:', error)
      } finally {
        setIsInitialLoad(false)
      }
    }

    loadInitialData()
  }, []) // 최초 1회만

  // 월 변경 시 날짜별 건수 로드
  const fetchDateCounts = useCallback(async () => {
    const cacheKey = `counts-${currentYear}-${currentMonth}`
    const cached = getCached<Record<string, DateCount>>(cacheKey)
    if (cached) {
      setDateCounts(cached)
      return
    }

    try {
      const res = await fetch(`/api/admin/appointments/count-by-date?year=${currentYear}&month=${currentMonth}`)
      const data = await res.json()
      if (data.success) {
        setDateCounts(data.counts)
        setCache(cacheKey, data.counts)
      }
    } catch (error) {
      console.error('날짜별 예약 건수 조회 오류:', error)
    }
  }, [currentYear, currentMonth])

  useEffect(() => {
    if (!isInitialLoad) {
      fetchDateCounts()
    }
  }, [currentYear, currentMonth, isInitialLoad])

  // 예약 목록 로드
  const fetchAppointments = useCallback(async (forceRefresh = false) => {
    // 짧은 시간 내 중복 호출 방지
    if (!forceRefresh && Date.now() - lastRefresh.current < 1000) {
      return
    }
    lastRefresh.current = Date.now()

    const dateToFetch = viewMode === 'calendar' ? selectedDate : filters.date
    const cacheKey = `appointments-${dateToFetch}-${filters.doctorId}-${filters.status}-${filters.search}`

    if (!forceRefresh) {
      const cached = getCached<Appointment[]>(cacheKey)
      if (cached) {
        setAppointments(cached)
        setIsLoading(false)
        return
      }
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('date', dateToFetch)
      if (filters.doctorId) params.append('doctorId', filters.doctorId)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`/api/admin/appointments?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
        setCache(cacheKey, data.appointments)
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('예약 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, selectedDate, viewMode, router])

  // 전체 예약 목록 로드
  const fetchAllAppointments = useCallback(async () => {
    setIsLoadingAll(true)
    try {
      const params = new URLSearchParams()
      if (allFilters.doctorId) params.append('doctorId', allFilters.doctorId)
      if (allFilters.status) params.append('status', allFilters.status)
      if (allFilters.search) params.append('search', allFilters.search)
      if (allFilters.startDate) params.append('startDate', allFilters.startDate)
      if (allFilters.endDate) params.append('endDate', allFilters.endDate)
      params.append('limit', '100')

      const res = await fetch(`/api/admin/appointments/all?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAllAppointments(data.appointments)
      }
    } catch (error) {
      console.error('전체 예약 조회 오류:', error)
    } finally {
      setIsLoadingAll(false)
    }
  }, [allFilters])

  // 뷰 모드가 'timeline'로 변경될 때 해당 날짜 예약 로드
  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchAppointments(true)
    }
  }, [viewMode])

  useEffect(() => {
    if (!isInitialLoad && viewMode !== 'all') {
      fetchAppointments()
    }
  }, [selectedDate, filters, viewMode, isInitialLoad])

  // refreshTrigger 변경 시 (WebSocket 이벤트)
  useEffect(() => {
    if (refreshTrigger > 0) {
      clearCache()
      fetchAppointments(true)
      fetchDateCounts()
    }
  }, [refreshTrigger])

  // WebSocket 실시간 동기화
  useWebSocket({
    onNewAppointment: (payload) => {
      console.log('🔔 새 예약 수신:', payload)
      clearCache()
      fetchDateCounts()
      if (payload?.date === selectedDate) {
        fetchAppointments(true)
      }
    },
    onCancelAppointment: (payload) => {
      console.log('❌ 예약 취소 수신:', payload)
      if (payload?.id) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: 'CANCELLED' } : apt)
        )
        clearCache()
        fetchDateCounts()
      }
    },
    onStatusUpdate: (payload) => {
      console.log('🔄 상태 변경 수신:', payload)
      if (payload?.id && payload?.status) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: payload.status as string } : apt)
        )
        clearCache()
        fetchDateCounts()
      }
    },
    onReschedule: () => {
      clearCache()
      fetchDateCounts()
      fetchAppointments(true)
    },
  })

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
        clearCache()
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
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate()
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(currentYear, currentMonth - 2, prevMonthDays - i), isCurrentMonth: false })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(currentYear, currentMonth - 1, i), isCurrentMonth: true })
    }

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
        clearCache()
        fetchDateCounts()
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
    if (reason === null) return
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
        clearCache()
        fetchDateCounts()
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

  // EMR 등록 완료 핸들러
  const handleEmrSync = async (appointmentId: string, currentSynced: boolean) => {
    const action = currentSynced ? '취소' : '완료'
    if (!confirm(`EMR 등록을 ${action} 처리하시겠습니까?`)) return
    
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/emr-sync`, {
        method: currentSynced ? 'DELETE' : 'POST'
      })
      const data = await res.json()
      
      if (data.success) {
        // 로컬 상태 업데이트
        const updateFn = (prev: Appointment[]) => prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, emrSynced: !currentSynced, emrSyncedAt: currentSynced ? undefined : new Date().toISOString() }
            : apt
        )
        setAppointments(updateFn)
        setAllAppointments(updateFn)
        clearCache()
      } else {
        alert(data.error || `EMR 등록 ${action} 실패`)
      }
    } catch (error) {
      console.error(`EMR 등록 ${action} 오류:`, error)
      alert(`EMR 등록 ${action} 중 오류가 발생했습니다.`)
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

  // 초기 로딩 스켈레톤
  if (isInitialLoad) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">예약 관리</h1>
        <div className="flex items-center gap-2">
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
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'timeline' ? 'bg-white shadow text-[#0066CC]' : 'text-gray-600'
              }`}
            >
              ⏰ 타임라인
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
          {[
            { color: 'bg-yellow-400', label: '대기' },
            { color: 'bg-blue-500', label: '확정' },
            { color: 'bg-green-500', label: '완료' },
            { color: 'bg-gray-400', label: '취소' },
            { color: 'bg-red-400', label: '거절' },
            { color: 'bg-purple-500', label: '노쇼' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${color}`}></span>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* 캘린더 */}
          <div className="flex-1 min-w-0 card">
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

            <div className="grid grid-cols-7 mb-2">
              {dayNames.map((day, idx) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${
                  idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {day}
                </div>
              ))}
            </div>

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
                        {count.pending > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-400 text-white" title="대기">
                            {count.pending}
                          </span>
                        )}
                        {count.booked > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-500 text-white" title="확정">
                            {count.booked}
                          </span>
                        )}
                        {count.completed > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-green-500 text-white" title="완료">
                            {count.completed}
                          </span>
                        )}
                        {count.noShow > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-purple-600 text-white" title="노쇼">
                            {count.noShow}
                          </span>
                        )}
                        {count.cancelled > 0 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-gray-400 text-white" title="취소">
                            {count.cancelled}
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
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse p-3 bg-gray-100 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {appointments.map((apt) => (
                  <div key={apt.id} className={`p-3 rounded-lg ${
                    apt.status === 'PENDING' ? 'bg-yellow-50 border border-yellow-200' : 
                    apt.status === 'BOOKED' ? 'bg-blue-50 border border-blue-200' :
                    apt.status === 'COMPLETED' ? 'bg-green-50 border border-green-200' :
                    apt.status === 'NO_SHOW' ? 'bg-purple-50 border border-purple-200' :
                    'bg-gray-50'
                  } ${!apt.emrSynced && ['BOOKED', 'COMPLETED'].includes(apt.status) ? 'ring-2 ring-red-300' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E293B]">{apt.time}</span>
                        {/* EMR 상태 표시 */}
                        {['BOOKED', 'COMPLETED'].includes(apt.status) && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            apt.emrSynced 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-600 animate-pulse'
                          }`}>
                            {apt.emrSynced ? 'EMR✓' : 'EMR⚠'}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1E293B] font-medium">{apt.patient.name}</p>
                    <p className="text-xs text-gray-500">{apt.doctor.name} · {apt.doctor.department}</p>
                    {apt.patient.phone && (
                      <p className="text-xs text-gray-400 mt-1">{formatPhone(apt.patient.phone)}</p>
                    )}
                    
                    {apt.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApprove(apt.id)}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                          ✓ 확정
                        </button>
                        <button
                          onClick={() => handleReject(apt.id)}
                          disabled={statusUpdating === apt.id}
                          className="flex-1 py-2 text-xs font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
                        >
                          ✕ 거절
                        </button>
                      </div>
                    )}
                    
                    {apt.status === 'BOOKED' && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                            disabled={statusUpdating === apt.id}
                            className="flex-1 py-2 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            ✓ 완료
                          </button>
                          <button
                            onClick={() => handleStatusChange(apt.id, 'NO_SHOW')}
                            disabled={statusUpdating === apt.id}
                            className="flex-1 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                          >
                            노쇼
                          </button>
                          <button
                            onClick={() => confirm('취소하시겠습니까?') && handleStatusChange(apt.id, 'CANCELLED')}
                            disabled={statusUpdating === apt.id}
                            className="flex-1 py-2 text-xs font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                        {/* EMR 등록 버튼 */}
                        <button
                          onClick={() => handleEmrSync(apt.id, apt.emrSynced || false)}
                          disabled={statusUpdating === apt.id}
                          className={`w-full py-2 text-xs font-bold rounded-lg disabled:opacity-50 ${
                            apt.emrSynced 
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                              : 'bg-purple-500 text-white hover:bg-purple-600'
                          }`}
                        >
                          {apt.emrSynced ? '✓ EMR 등록됨 (취소)' : '📋 EMR 등록 완료'}
                        </button>
                      </div>
                    )}

                    {apt.status === 'COMPLETED' && !apt.emrSynced && (
                      <button
                        onClick={() => handleEmrSync(apt.id, false)}
                        disabled={statusUpdating === apt.id}
                        className="mt-3 w-full py-2 text-xs font-bold bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                      >
                        📋 EMR 등록 완료
                      </button>
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

      {/* 타임라인 뷰 - 담당의/시간별 */}
      {viewMode === 'timeline' && (
        <>
          {/* 날짜 선택 */}
          <div className="card mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-[#64748B] mb-1">날짜 선택</label>
                <input
                  type="date"
                  className="input-field text-sm py-2"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setFilters(prev => ({ ...prev, date: e.target.value }))
                  }}
                />
              </div>
              <div className="pt-5">
                <button
                  onClick={() => {
                    setSelectedDate(todayStr)
                    setFilters(prev => ({ ...prev, date: todayStr }))
                  }}
                  className="btn-secondary text-sm"
                >
                  오늘
                </button>
              </div>
            </div>
          </div>

          {/* 타임라인 그리드 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1E293B]">
                📅 {formatDateKorean(selectedDate)} 예약 현황
              </h3>
              <div className="text-sm text-gray-500">
                총 {appointments.length}건
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 시간대별 헤더 */}
                <div className="min-w-[800px]">
                  {/* 의사 목록 헤더 */}
                  <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0">
                    <div className="w-20 flex-shrink-0 p-2 font-medium text-sm text-gray-600 border-r">
                      시간
                    </div>
                    {doctors.filter(d => d.isActive !== false).map(doctor => (
                      <div 
                        key={doctor.id} 
                        className="flex-1 min-w-[150px] p-2 text-center font-medium text-sm text-gray-700 border-r last:border-r-0"
                      >
                        {doctor.name}
                      </div>
                    ))}
                  </div>

                  {/* 시간대별 행 */}
                  {(() => {
                    // 09:00 ~ 18:00 시간대 생성
                    const timeSlots: string[] = []
                    for (let h = 9; h <= 18; h++) {
                      for (let m = 0; m < 60; m += 15) {
                        timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
                      }
                    }

                    // 의사별로 예약 그룹화
                    const appointmentsByDoctor = doctors.reduce((acc, doctor) => {
                      acc[doctor.id] = appointments.filter(apt => apt.doctor.id === doctor.id)
                      return acc
                    }, {} as Record<string, Appointment[]>)

                    return timeSlots.map(time => {
                      const activeDoctors = doctors.filter(d => d.isActive !== false)
                      const hasAnyAppointment = activeDoctors.some(doctor => 
                        appointmentsByDoctor[doctor.id]?.some(apt => apt.time === time)
                      )
                      
                      // 15분 단위에서 정각/30분만 표시
                      const [h, m] = time.split(':')
                      const isMainTime = m === '00' || m === '30'

                      return (
                        <div 
                          key={time} 
                          className={`flex border-b border-gray-100 ${hasAnyAppointment ? 'bg-blue-50/30' : ''} ${isMainTime ? '' : 'opacity-70'}`}
                        >
                          <div className={`w-20 flex-shrink-0 p-2 text-xs border-r ${isMainTime ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                            {time}
                          </div>
                          {activeDoctors.map(doctor => {
                            const doctorAppts = appointmentsByDoctor[doctor.id]?.filter(apt => apt.time === time) || []
                            
                            return (
                              <div 
                                key={doctor.id} 
                                className="flex-1 min-w-[150px] p-1 border-r last:border-r-0"
                              >
                                {doctorAppts.map(apt => (
                                  <div 
                                    key={apt.id}
                                    className={`p-2 rounded text-xs mb-1 cursor-pointer hover:opacity-80 ${
                                      apt.status === 'PENDING' ? 'bg-yellow-100 border border-yellow-300' :
                                      apt.status === 'BOOKED' ? 'bg-blue-100 border border-blue-300' :
                                      apt.status === 'COMPLETED' ? 'bg-green-100 border border-green-300' :
                                      apt.status === 'NO_SHOW' ? 'bg-purple-100 border border-purple-300' :
                                      'bg-gray-100 border border-gray-300'
                                    }`}
                                    onClick={() => {
                                      if (apt.status === 'PENDING' && confirm('예약을 확정하시겠습니까?')) {
                                        handleApprove(apt.id)
                                      }
                                    }}
                                  >
                                    <div className="font-medium truncate">{apt.patient.name}</div>
                                    <div className="text-gray-500 truncate">{formatPhone(apt.patient.phone)}</div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className={`px-1 py-0.5 rounded text-[10px] ${getStatusStyle(apt.status)}`}>
                                        {getStatusLabel(apt.status)}
                                      </span>
                                      {!apt.emrSynced && ['BOOKED', 'COMPLETED'].includes(apt.status) && (
                                        <span className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-600">
                                          EMR⚠
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* 범례 */}
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4">
              <span className="text-xs text-gray-500 font-medium">상태:</span>
              {[
                { color: 'bg-yellow-100 border-yellow-300', label: '대기' },
                { color: 'bg-blue-100 border-blue-300', label: '확정' },
                { color: 'bg-green-100 border-green-300', label: '완료' },
                { color: 'bg-purple-100 border-purple-300', label: '노쇼' },
                { color: 'bg-gray-100 border-gray-300', label: '취소' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className={`w-4 h-4 rounded border ${color}`}></span>
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 목록 뷰 */}
      {viewMode === 'list' && (
        <>
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
                      {doctor.name}
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
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">검색</label>
                <input
                  type="text"
                  className="input-field text-sm py-2"
                  placeholder="환자명/전화번호"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
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
                    {appointments.map((apt) => (
                      <tr key={apt.id} className={`border-b border-gray-50 ${
                        apt.status === 'PENDING' ? 'bg-yellow-50' : 'hover:bg-gray-50'
                      }`}>
                        <td className="py-3 px-2 text-sm font-medium">{apt.time}</td>
                        <td className="py-3 px-2 text-sm">{apt.patient.name}</td>
                        <td className="py-3 px-2 text-sm text-gray-500 hidden md:table-cell">{formatPhone(apt.patient.phone)}</td>
                        <td className="py-3 px-2 text-sm text-gray-500">{apt.doctor.name}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(apt.status)}`}>
                            {getStatusLabel(apt.status)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            {apt.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(apt.id)} disabled={statusUpdating === apt.id}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">확정</button>
                                <button onClick={() => handleReject(apt.id)} disabled={statusUpdating === apt.id}
                                  className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50">거절</button>
                              </>
                            )}
                            {apt.status === 'BOOKED' && (
                              <>
                                <button onClick={() => handleStatusChange(apt.id, 'COMPLETED')} disabled={statusUpdating === apt.id}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">완료</button>
                                <button onClick={() => handleStatusChange(apt.id, 'NO_SHOW')} disabled={statusUpdating === apt.id}
                                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">노쇼</button>
                              </>
                            )}
                            {['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(apt.status) && (
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
              <div className="text-center py-8 text-gray-500">검색 조건에 맞는 예약이 없습니다.</div>
            )}
            <div className="mt-4 text-sm text-gray-500">총 {appointments.length}건</div>
          </div>
        </>
      )}
    </div>
  )
}
