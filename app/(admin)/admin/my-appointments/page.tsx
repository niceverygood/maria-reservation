'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatLocalDate, getTodayString, formatDateKorean } from '@/lib/dateUtils'

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

interface ChangeRequest {
  id: string
  requestType: string
  originalDate: string | null
  originalTime: string | null
  newDate: string | null
  newTime: string | null
  offDate: string | null
  offReason: string | null
  reason: string | null
  status: string
  createdAt: string
}

export default function MyAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [doctorInfo, setDoctorInfo] = useState<{ id: string; name: string; department: string } | null>(null)
  const [error, setError] = useState('')

  // 캘린더 상태
  const today = new Date()
  const todayStr = getTodayString()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [dateCounts, setDateCounts] = useState<Record<string, DateCount>>({})
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  // 변경 요청 모달 상태
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestType, setRequestType] = useState<'RESCHEDULE' | 'CANCEL' | 'OFF_DAY'>('OFF_DAY')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [requestForm, setRequestForm] = useState({
    newDate: '',
    newTime: '',
    offDate: '',
    offReason: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // 내 요청 목록 상태
  const [myRequests, setMyRequests] = useState<ChangeRequest[]>([])
  const [showMyRequests, setShowMyRequests] = useState(false)

  // 의사 정보 및 권한 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me')
        const data = await res.json()
        
        if (!data.success) {
          router.push('/admin/login')
          return
        }
        
        if (data.user.role !== 'DOCTOR') {
          setError('의사 계정만 접근할 수 있습니다.')
          return
        }
        
        setDoctorInfo({
          id: data.user.doctorId,
          name: data.user.name,
          department: data.user.department || '',
        })
      } catch (err) {
        console.error('인증 확인 오류:', err)
        router.push('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  // 날짜별 예약 건수 불러오기
  const fetchDateCounts = useCallback(async () => {
    if (!doctorInfo) return
    
    try {
      const res = await fetch(
        `/api/admin/appointments/count-by-date?year=${currentYear}&month=${currentMonth}&doctorId=${doctorInfo.id}`
      )
      const data = await res.json()
      if (data.success) {
        setDateCounts(data.counts)
      }
    } catch (error) {
      console.error('날짜별 예약 건수 조회 오류:', error)
    }
  }, [currentYear, currentMonth, doctorInfo])

  useEffect(() => {
    fetchDateCounts()
  }, [fetchDateCounts])

  // 예약 목록 불러오기
  const fetchAppointments = useCallback(async () => {
    if (!doctorInfo) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/appointments?date=${selectedDate}&doctorId=${doctorInfo.id}`)
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error('예약 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, doctorInfo])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // 내 변경 요청 목록 불러오기
  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/doctor/change-requests')
      const data = await res.json()
      if (data.success) {
        setMyRequests(data.requests)
      }
    } catch (error) {
      console.error('변경 요청 목록 조회 오류:', error)
    }
  }, [])

  useEffect(() => {
    if (doctorInfo) {
      fetchMyRequests()
    }
  }, [doctorInfo, fetchMyRequests])

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
        setAppointments(prev =>
          prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
        )
        fetchDateCounts()
      } else {
        alert(data.error || '상태 변경 실패')
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    } finally {
      setStatusUpdating(null)
    }
  }

  // 예약 승인
  const handleApprove = async (appointmentId: string) => {
    if (!confirm('이 예약을 확정하시겠습니까?')) return
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'BOOKED' } : apt))
        fetchDateCounts()
      } else {
        alert(data.error || '승인 실패')
      }
    } catch (error) {
      console.error('승인 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  // 예약 거절
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
        fetchDateCounts()
      } else {
        alert(data.error || '거절 실패')
      }
    } catch (error) {
      console.error('거절 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  // 변경 요청 제출
  const handleSubmitRequest = async () => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        requestType,
        reason: requestForm.reason,
      }

      if (requestType === 'OFF_DAY') {
        payload.offDate = requestForm.offDate
        payload.offReason = requestForm.offReason
      } else if (selectedAppointment) {
        payload.appointmentId = selectedAppointment.id
        payload.originalDate = selectedAppointment.date
        payload.originalTime = selectedAppointment.time
        if (requestType === 'RESCHEDULE') {
          payload.newDate = requestForm.newDate
          payload.newTime = requestForm.newTime
        }
      }

      const res = await fetch('/api/doctor/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        alert('변경 요청이 전송되었습니다.')
        setShowRequestModal(false)
        setSelectedAppointment(null)
        setRequestForm({ newDate: '', newTime: '', offDate: '', offReason: '', reason: '' })
        fetchMyRequests()
      } else {
        alert(data.error || '요청 실패')
      }
    } catch (error) {
      console.error('변경 요청 오류:', error)
      alert('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 예약 변경 요청 열기
  const openRescheduleModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setRequestType('RESCHEDULE')
    setShowRequestModal(true)
  }

  // 예약 취소 요청 열기
  const openCancelModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setRequestType('CANCEL')
    setShowRequestModal(true)
  }

  // 휴진 요청 열기
  const openOffDayModal = () => {
    setSelectedAppointment(null)
    setRequestType('OFF_DAY')
    setRequestForm({ ...requestForm, offDate: selectedDate })
    setShowRequestModal(true)
  }

  // 캘린더 계산
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
    setSelectedDate(formatLocalDate(date))
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'BOOKED': return 'bg-blue-100 text-blue-700'
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      case 'REJECTED': return 'bg-red-100 text-red-700'
      case 'NO_SHOW': return 'bg-purple-100 text-purple-700'
      case 'APPROVED': return 'bg-green-100 text-green-700'
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
      case 'APPROVED': return '승인'
      default: return status
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'RESCHEDULE': return '일정 변경'
      case 'CANCEL': return '예약 취소'
      case 'OFF_DAY': return '휴진 요청'
      default: return type
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    return phone
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  const pendingRequestCount = myRequests.filter(r => r.status === 'PENDING').length

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.push('/admin/login')} className="btn-primary">
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  if (!doctorInfo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">내 예약 관리</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {doctorInfo.name} 선생님 · {doctorInfo.department}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMyRequests(true)}
            className="relative px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            📋 내 요청
            {pendingRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingRequestCount}
              </span>
            )}
          </button>
          <button
            onClick={openOffDayModal}
            className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            🏖️ 휴진 요청
          </button>
        </div>
      </div>

      {/* 색상 범례 */}
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
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-400 text-white">
                          {count.pending}
                        </span>
                      )}
                      {count.booked > 0 && (
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-500 text-white">
                          {count.booked}
                        </span>
                      )}
                      {count.completed > 0 && (
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-green-500 text-white">
                          {count.completed}
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
                  apt.status === 'NO_SHOW' ? 'bg-purple-50 border border-purple-200' :
                  'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#1E293B]">{apt.time}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1E293B] font-medium">{apt.patient.name}</p>
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
                    <>
                      <div className="mt-3 flex gap-1">
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
                          className="flex-1 py-2 text-xs font-bold bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                        >
                          노쇼
                        </button>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => openRescheduleModal(apt)}
                          className="flex-1 py-1.5 text-xs font-medium bg-white border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
                        >
                          📅 일정 변경 요청
                        </button>
                        <button
                          onClick={() => openCancelModal(apt)}
                          className="flex-1 py-1.5 text-xs font-medium bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                        >
                          ✕ 취소 요청
                        </button>
                      </div>
                    </>
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

      {/* 변경 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#1E293B] mb-4">
              {requestType === 'OFF_DAY' ? '🏖️ 휴진 요청' :
               requestType === 'CANCEL' ? '❌ 예약 취소 요청' : '📅 일정 변경 요청'}
            </h2>

            {selectedAppointment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">현재 예약</p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAppointment.date} {selectedAppointment.time} - {selectedAppointment.patient.name}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {requestType === 'OFF_DAY' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">휴진 날짜 *</label>
                    <input
                      type="date"
                      className="input-field"
                      value={requestForm.offDate}
                      onChange={(e) => setRequestForm({ ...requestForm, offDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">휴진 사유</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="예: 학회 참석, 개인 사정"
                      value={requestForm.offReason}
                      onChange={(e) => setRequestForm({ ...requestForm, offReason: e.target.value })}
                    />
                  </div>
                </>
              )}

              {requestType === 'RESCHEDULE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">변경할 날짜 *</label>
                    <input
                      type="date"
                      className="input-field"
                      value={requestForm.newDate}
                      onChange={(e) => setRequestForm({ ...requestForm, newDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">변경할 시간 *</label>
                    <input
                      type="time"
                      className="input-field"
                      value={requestForm.newTime}
                      onChange={(e) => setRequestForm({ ...requestForm, newTime: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {requestType === 'OFF_DAY' ? '추가 메모' : '변경/취소 사유'}
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="관리자에게 전달할 내용을 입력하세요"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false)
                  setSelectedAppointment(null)
                  setRequestForm({ newDate: '', newTime: '', offDate: '', offReason: '', reason: '' })
                }}
                className="flex-1 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] disabled:opacity-50"
              >
                {submitting ? '전송 중...' : '요청 전송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 내 요청 목록 모달 */}
      {showMyRequests && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1E293B]">📋 내 변경 요청</h2>
              <button onClick={() => setShowMyRequests(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {myRequests.length > 0 ? (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div key={req.id} className={`p-3 rounded-lg border ${
                    req.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                    req.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {getRequestTypeLabel(req.requestType)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                    {req.requestType === 'OFF_DAY' ? (
                      <p className="text-sm text-gray-600">휴진일: {req.offDate}</p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        {req.originalDate} {req.originalTime}
                        {req.newDate && ` → ${req.newDate} ${req.newTime}`}
                      </p>
                    )}
                    {req.reason && (
                      <p className="text-xs text-gray-500 mt-1">사유: {req.reason}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(req.createdAt).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                요청 내역이 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
