'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
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

export default function MyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

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
        // 예약 목록 새로고침
        await fetchAppointments(patient)
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
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  // 상태 표시
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">예약됨</span>
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">완료</span>
      case 'CANCELLED':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">취소됨</span>
      case 'NO_SHOW':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">노쇼</span>
      default:
        return null
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#E8F4FD] to-white">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FD] to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#0066CC]">
            일산마리아병원
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-[#94A3B8] hover:text-[#64748B]"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 프로필 카드 */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0066CC] rounded-full flex items-center justify-center">
              <span className="text-2xl text-white font-bold">
                {patient?.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#1E293B]">
                {patient?.name}님
              </h1>
              {patient?.kakaoId && (
                <div className="flex items-center gap-1 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FEE500">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-xs text-[#64748B]">카카오 연동</span>
                </div>
              )}
              <p className="text-sm text-[#64748B] mt-1">
                {patient?.phone?.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/mypage/edit"
              className="text-sm text-[#0066CC] hover:underline"
            >
              프로필 수정 →
            </Link>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/reserve"
            className="card text-center py-4 hover:border-[#0066CC] hover:bg-[#E8F4FD] transition-all"
          >
            <div className="w-10 h-10 mx-auto bg-[#E8F4FD] rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1E293B]">새 예약하기</p>
          </Link>
          <Link
            href="/reserve/lookup"
            className="card text-center py-4 hover:border-[#0066CC] hover:bg-[#E8F4FD] transition-all"
          >
            <div className="w-10 h-10 mx-auto bg-[#E8F4FD] rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1E293B]">예약 조회</p>
          </Link>
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
                  <p className="text-[#64748B] mb-4">예정된 예약이 없습니다.</p>
                  <Link href="/reserve" className="text-sm text-[#0066CC] hover:underline">
                    새 예약하기 →
                  </Link>
                </div>
              ) : (
                upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 border border-gray-200 rounded-lg">
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
                    <button
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancellingId === apt.id}
                      className="mt-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {cancellingId === apt.id ? '취소 중...' : '예약 취소'}
                    </button>
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
                  <div key={apt.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
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

        {/* 하단 메뉴 */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/" className="block text-sm text-[#64748B] hover:text-[#1E293B]">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}

