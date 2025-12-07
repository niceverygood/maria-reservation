'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatLocalDate, getTodayString } from '@/lib/dateUtils'

interface Doctor {
  id: string
  name: string
  department: string
  position: string
  bio: string
  isActive: boolean
}

interface Patient {
  id: string
  name: string
  phone: string
  birthDate: string
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
  noShow: number
}

export default function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateCounts, setDateCounts] = useState<Record<string, DateCount>>({})
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // 의사 정보 로드
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await fetch(`/api/admin/doctors/${id}`)
        const data = await res.json()
        if (data.success) {
          setDoctor(data.doctor)
        } else {
          router.push('/admin/doctors')
        }
      } catch (error) {
        console.error('의사 정보 로드 오류:', error)
        router.push('/admin/doctors')
      }
    }
    fetchDoctor()
  }, [id, router])

  // 해당 의사의 예약 현황 로드
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/doctors/${id}/appointments?date=${selectedDate}`)
        const data = await res.json()
        if (data.success) {
          setAppointments(data.appointments)
        }
      } catch (error) {
        console.error('예약 현황 로드 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAppointments()
  }, [id, selectedDate])

  // 월별 예약 건수 로드
  useEffect(() => {
    const fetchDateCounts = async () => {
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1
        const res = await fetch(`/api/admin/doctors/${id}/appointments/count-by-date?year=${year}&month=${month}`)
        const data = await res.json()
        if (data.success) {
          setDateCounts(data.counts)
        }
      } catch (error) {
        console.error('날짜별 예약 건수 로드 오류:', error)
      }
    }
    fetchDateCounts()
  }, [id, currentMonth])

  // 상태 변경
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
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  // 달력 생성
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const formatDateToString = (date: Date) => formatLocalDate(date)

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'BOOKED': return 'bg-blue-100 text-blue-700'
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      case 'REJECTED': return 'bg-red-100 text-red-700'
      case 'NO_SHOW': return 'bg-orange-100 text-orange-700'
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

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    }
    return phone
  }

  const days = getDaysInMonth()
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const today = getTodayString()

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-[#64748B]">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href="/admin/doctors"
          className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0066CC] mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          의사 관리로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#E8F4FD] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-[#0066CC]">{doctor.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">{doctor.name}</h1>
              <p className="text-[#64748B]">{doctor.department} · {doctor.position}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {doctor.isActive ? '활성' : '비활성'}
          </span>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <div className="lg:col-span-1 card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
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
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-2 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) return <div key={i} />
              const dateStr = formatDateToString(date)
              const count = dateCounts[dateStr]
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === today

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square p-1 rounded-lg text-sm transition-all relative ${
                    isSelected
                      ? 'bg-[#0066CC] text-white'
                      : isToday
                      ? 'bg-[#E8F4FD] text-[#0066CC] font-semibold'
                      : date.getDay() === 0
                      ? 'text-red-400 hover:bg-gray-100'
                      : date.getDay() === 6
                      ? 'text-blue-400 hover:bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {count && count.total > 0 && (
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold ${
                      isSelected ? 'text-white/80' : 'text-[#0066CC]'
                    }`}>
                      {count.total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">상태별 색상</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span> 대기
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 확정
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> 완료
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> 노쇼
              </span>
            </div>
          </div>
        </div>

        {/* 예약 목록 */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1E293B]">
              📅 {new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 예약
            </h2>
            <span className="text-sm text-[#64748B]">총 {appointments.length}건</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-6 h-6 border-3 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`p-4 rounded-lg border ${
                    apt.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                    apt.status === 'BOOKED' ? 'bg-blue-50 border-blue-200' :
                    apt.status === 'COMPLETED' ? 'bg-green-50 border-green-200' :
                    apt.status === 'NO_SHOW' ? 'bg-orange-50 border-orange-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#1E293B]">{apt.time}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1E293B]">{apt.patient.name}</p>
                        <p className="text-sm text-[#64748B]">{formatPhone(apt.patient.phone)}</p>
                        {apt.memo && (
                          <p className="text-xs text-gray-500 mt-1 bg-white px-2 py-1 rounded">
                            📝 {apt.memo}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                      
                      {/* 상태 변경 버튼 */}
                      <div className="mt-2 flex flex-wrap gap-1 justify-end">
                        {apt.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(apt.id, 'BOOKED')}
                              disabled={statusUpdating === apt.id}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                              확정
                            </button>
                            <button
                              onClick={() => handleStatusChange(apt.id, 'REJECTED')}
                              disabled={statusUpdating === apt.id}
                              className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {apt.status === 'BOOKED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                              disabled={statusUpdating === apt.id}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              완료
                            </button>
                            <button
                              onClick={() => handleStatusChange(apt.id, 'NO_SHOW')}
                              disabled={statusUpdating === apt.id}
                              className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                            >
                              노쇼
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#64748B]">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>해당 날짜에 예약이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

