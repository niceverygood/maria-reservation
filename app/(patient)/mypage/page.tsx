'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  memo?: string
  doctor: {
    name: string
    department: string
  }
}

interface PatientInfo {
  patientId: string
  name: string
  birthDate: string
  phone: string
  kakaoId?: string
}

// 병원 전화번호
const HOSPITAL_PHONE = '031-123-4567'

export default function MyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // 로그인 상태 확인 및 환자 정보 로드
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (!data.success) {
          router.push('/login?redirect=/mypage')
          return
        }
        
        setPatient(data.patient)
        await fetchAppointments(data.patient)
      } catch {
        router.push('/login?redirect=/mypage')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // 예약 목록 조회
  const fetchAppointments = async (patientInfo: PatientInfo) => {
    try {
      const res = await fetch('/api/patient/appointments/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientInfo.name,
          birthDate: patientInfo.birthDate,
          phone: patientInfo.phone,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAppointments(data.appointments || [])
      }
    } catch (err) {
      console.error('예약 목록 로드 실패:', err)
    }
  }

  // 예약 취소
  const handleCancel = async (appointmentId: string) => {
    if (!patient) return
    if (!confirm('정말 이 예약을 취소하시겠습니까?')) return

    setCancellingId(appointmentId)
    try {
      const res = await fetch('/api/patient/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          name: patient.name,
          birthDate: patient.birthDate,
          phone: patient.phone,
        }),
      })
      const data = await res.json()
      
      if (data.success) {
        await fetchAppointments(patient)
        setSelectedAppointment(null)
        alert('예약이 취소되었습니다.')
      } else {
        alert(data.error || '예약 취소에 실패했습니다.')
      }
    } catch {
      alert('예약 취소 중 오류가 발생했습니다.')
    } finally {
      setCancellingId(null)
    }
  }

  // 로그아웃
  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  // 전화 연결
  const handleCall = () => {
    window.location.href = `tel:${HOSPITAL_PHONE.replace(/-/g, '')}`
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  // 전체 날짜 포맷
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  // 상태 표시
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">예약됨</span>
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">진료완료</span>
      case 'CANCELLED':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">취소됨</span>
      case 'NO_SHOW':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">노쇼</span>
      default:
        return null
    }
  }

  // 상태 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'BOOKED': return '예약됨'
      case 'COMPLETED': return '진료완료'
      case 'CANCELLED': return '취소됨'
      case 'NO_SHOW': return '노쇼'
      default: return status
    }
  }

  // 예약 필터링
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date)
    return aptDate >= today && apt.status === 'BOOKED'
  })
  
  const pastAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date)
    return aptDate < today || apt.status !== 'BOOKED'
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-[#E8F4FD] to-white min-h-screen">
      <div className="px-4 py-6">
        {/* 프로필 카드 */}
        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0066CC] rounded-full flex items-center justify-center">
              <span className="text-xl text-white font-bold">
                {patient?.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-[#1E293B]">
                {patient?.name}님
              </h1>
              {patient?.kakaoId && (
                <div className="flex items-center gap-1 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FEE500">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-xs text-[#64748B]">카카오 연동</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={handleCall}
            className="card py-3 text-center hover:bg-[#E8F4FD] transition-colors"
          >
            <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-1">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className="text-xs text-[#1E293B] font-medium">전화하기</p>
          </button>
          <Link
            href="/reserve"
            className="card py-3 text-center hover:bg-[#E8F4FD] transition-colors"
          >
            <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-1">
              <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xs text-[#1E293B] font-medium">새 예약</p>
          </Link>
          <button
            onClick={handleLogout}
            className="card py-3 text-center hover:bg-red-50 transition-colors"
          >
            <div className="w-10 h-10 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-1">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <p className="text-xs text-[#1E293B] font-medium">로그아웃</p>
          </button>
        </div>

        {/* 예약 목록 */}
        <div className="card">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">내 예약</h2>
          
          {/* 탭 */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upcoming'
                  ? 'border-[#0066CC] text-[#0066CC]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              예정된 예약 ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'past'
                  ? 'border-[#0066CC] text-[#0066CC]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              지난 예약 ({pastAppointments.length})
            </button>
          </div>

          {/* 예약 리스트 */}
          <div className="space-y-3">
            {activeTab === 'upcoming' ? (
              upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-[#64748B] mb-4">예정된 예약이 없습니다.</p>
                  <Link 
                    href="/reserve" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066CC] text-white rounded-lg text-sm font-medium hover:bg-[#0052A3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    새 예약하기
                  </Link>
                </div>
              ) : (
                upcomingAppointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#0066CC] transition-colors cursor-pointer"
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-[#1E293B]">
                          {formatDate(apt.date)} {apt.time}
                        </p>
                        <p className="text-sm text-[#64748B]">
                          {apt.doctor.name} 선생님 · {apt.doctor.department}
                        </p>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                    <p className="text-xs text-[#0066CC]">탭하여 상세보기 →</p>
                  </div>
                ))
              )
            ) : (
              pastAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#64748B]">지난 예약이 없습니다.</p>
                </div>
              ) : (
                pastAppointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="p-4 border border-gray-100 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[#64748B]">
                          {formatDate(apt.date)} {apt.time}
                        </p>
                        <p className="text-sm text-[#94A3B8]">
                          {apt.doctor.name} 선생님 · {apt.doctor.department}
                        </p>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* 병원 정보 */}
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1E293B]">일산마리아병원</p>
              <p className="text-xs text-[#64748B]">{HOSPITAL_PHONE}</p>
            </div>
            <button
              onClick={handleCall}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              전화
            </button>
          </div>
        </div>
      </div>

      {/* 예약 상세 모달 */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl animate-slide-up">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1E293B]">예약 상세</h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 상태 */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedAppointment.status)}
                <span className="text-sm text-[#64748B]">{getStatusText(selectedAppointment.status)}</span>
              </div>

              {/* 예약 정보 */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">예약 일시</p>
                    <p className="font-semibold text-[#1E293B]">
                      {formatFullDate(selectedAppointment.date)}
                    </p>
                    <p className="font-semibold text-[#1E293B]">{selectedAppointment.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">담당 의사</p>
                    <p className="font-semibold text-[#1E293B]">
                      {selectedAppointment.doctor.name} 선생님
                    </p>
                    <p className="text-sm text-[#64748B]">{selectedAppointment.doctor.department}</p>
                  </div>
                </div>
              </div>

              {/* 버튼들 */}
              <div className="pt-4 space-y-2">
                {selectedAppointment.status === 'BOOKED' && (
                  <button
                    onClick={() => handleCancel(selectedAppointment.id)}
                    disabled={cancellingId === selectedAppointment.id}
                    className="w-full py-3 border border-red-200 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === selectedAppointment.id ? '취소 중...' : '예약 취소하기'}
                  </button>
                )}
                
                {(selectedAppointment.status === 'COMPLETED' || selectedAppointment.status === 'CANCELLED' || selectedAppointment.status === 'NO_SHOW') && (
                  <Link
                    href="/reserve"
                    className="block w-full py-3 bg-[#0066CC] text-white rounded-lg font-medium text-center hover:bg-[#0052A3] transition-colors"
                    onClick={() => setSelectedAppointment(null)}
                  >
                    다시 예약하기
                  </Link>
                )}

                <button
                  onClick={handleCall}
                  className="w-full py-3 border border-gray-200 text-[#1E293B] rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  병원에 전화하기
                </button>
              </div>
            </div>

            {/* Safe area */}
            <div className="h-8 bg-white" />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
