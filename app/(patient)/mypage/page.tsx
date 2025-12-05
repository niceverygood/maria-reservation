'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientInfo {
  id: string
  name: string
  birthDate: string | null
  phone: string | null
  kakaoProfile?: string
}

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

export default function MyPage() {
  const router = useRouter()
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 환자 정보 가져오기
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        
        if (!authData.success) {
          router.push('/login?redirect=/mypage')
          return
        }
        
        setPatient(authData.patient)
        
        // 예약 목록 가져오기
        const appointRes = await fetch('/api/patient/appointments/my')
        const appointData = await appointRes.json()
        
        if (appointData.success) {
          setAppointments(appointData.appointments)
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (err) {
      console.error('로그아웃 실패:', err)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    
    try {
      const res = await fetch(`/api/patient/appointments/${appointmentId}/cancel`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (data.success) {
        setAppointments(prev =>
          prev.map(a => a.id === appointmentId ? { ...a, status: 'CANCELLED' } : a)
        )
        alert('예약이 취소되었습니다.')
      }
    } catch (err) {
      console.error('예약 취소 실패:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  const formatBirthDate = (bd: string | null) => {
    if (!bd || bd.length !== 8) return '-'
    return `${bd.slice(0, 4)}.${bd.slice(4, 6)}.${bd.slice(6, 8)}`
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return <span className="px-2 py-0.5 bg-[#E8F5F2] text-[#5B9A8B] text-xs rounded-full">예약완료</span>
      case 'COMPLETED':
        return <span className="px-2 py-0.5 bg-gray-100 text-[#636E72] text-xs rounded-full">진료완료</span>
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-red-50 text-[#E57373] text-xs rounded-full">취소됨</span>
      case 'NO_SHOW':
        return <span className="px-2 py-0.5 bg-yellow-50 text-[#E9B171] text-xs rounded-full">미방문</span>
      default:
        return null
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingAppointments = appointments.filter(
    a => new Date(a.date) >= today && a.status === 'BOOKED'
  )
  const pastAppointments = appointments.filter(
    a => new Date(a.date) < today || a.status !== 'BOOKED'
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F9F8] p-5">
        <p className="text-[#636E72] mb-4">로그인이 필요합니다</p>
        <Link href="/login" className="btn-primary">
          로그인하기
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-20">
      {/* 헤더 */}
      <header className="header-gradient px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#2D3436]">MY</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-[#636E72] hover:text-[#E57373] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="px-5 -mt-2">
        {/* 프로필 카드 */}
        <div className="card mb-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5B9A8B] to-[#4A8577] rounded-full flex items-center justify-center overflow-hidden">
              {patient.kakaoProfile ? (
                <img src={patient.kakaoProfile} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {patient.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#2D3436]">{patient.name}님</h2>
              <p className="text-sm text-[#636E72]">{formatBirthDate(patient.birthDate)}</p>
              <p className="text-sm text-[#636E72]">{formatPhone(patient.phone)}</p>
            </div>
            <Link href="/mypage/edit" className="text-[#5B9A8B]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link href="/reserve" className="card py-4 text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 mx-auto bg-[#E8F5F2] rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm text-[#2D3436]">새 예약</span>
          </Link>
          <button 
            onClick={() => window.location.href = 'tel:031-123-4567'}
            className="card py-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 mx-auto bg-[#E8F5F2] rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-sm text-[#2D3436]">전화하기</span>
          </button>
          <Link href="/guide" className="card py-4 text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 mx-auto bg-[#E8F5F2] rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-[#2D3436]">도움말</span>
          </Link>
        </div>

        {/* 예약 내역 */}
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">예약 내역</h3>
            <Link href="/reserve/lookup" className="section-link">
              전체보기
            </Link>
          </div>

          {/* 탭 */}
          <div className="flex bg-[#F5F9F8] rounded-xl p-1 mb-4">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-white text-[#5B9A8B] shadow-sm'
                  : 'text-[#636E72]'
              }`}
            >
              예정된 예약 ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'past'
                  ? 'bg-white text-[#5B9A8B] shadow-sm'
                  : 'text-[#636E72]'
              }`}
            >
              지난 예약 ({pastAppointments.length})
            </button>
          </div>

          {/* 예약 목록 */}
          <div className="space-y-3">
            {(activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-[#F5F9F8] rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[#B2BEC3]">
                  {activeTab === 'upcoming' ? '예정된 예약이 없습니다' : '지난 예약이 없습니다'}
                </p>
                {activeTab === 'upcoming' && (
                  <Link href="/reserve" className="inline-block mt-3 text-[#5B9A8B] font-medium">
                    예약하러 가기 →
                  </Link>
                )}
              </div>
            ) : (
              (activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).map((appointment) => (
                <div key={appointment.id} className="p-4 bg-[#F5F9F8] rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-[#2D3436]">{formatDate(appointment.date)}</p>
                      <p className="text-sm text-[#636E72]">{appointment.time}</p>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#636E72]">
                    <span>{appointment.doctor.name} 선생님</span>
                    <span>·</span>
                    <span>{appointment.doctor.department}</span>
                  </div>
                  
                  {activeTab === 'upcoming' && appointment.status === 'BOOKED' && (
                    <div className="flex gap-2 mt-3">
                      <Link 
                        href={`/reserve?reschedule=${appointment.id}`}
                        className="flex-1 py-2 text-center text-sm text-[#5B9A8B] border border-[#5B9A8B] rounded-lg hover:bg-[#E8F5F2] transition-colors"
                      >
                        일정 변경
                      </Link>
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="flex-1 py-2 text-center text-sm text-[#E57373] border border-[#E57373] rounded-lg hover:bg-red-50 transition-colors"
                      >
                        예약 취소
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'past' && appointment.status === 'COMPLETED' && (
                    <Link 
                      href={`/reserve?doctorId=${appointment.doctor}`}
                      className="block mt-3 py-2 text-center text-sm text-[#5B9A8B] border border-[#5B9A8B] rounded-lg hover:bg-[#E8F5F2] transition-colors"
                    >
                      다시 예약하기
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
