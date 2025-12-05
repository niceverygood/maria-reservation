'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/patient/BottomNav'
import MiniCalendar from '@/components/patient/MiniCalendar'

interface PatientInfo {
  id: string
  name: string
  kakaoProfile?: string
}

interface DoctorInfo {
  id: string
  name: string
  department: string
}

export default function Home() {
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [assignedDoctor, setAssignedDoctor] = useState<DoctorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.success) {
          setPatient(data.patient)
          // 담당의 정보 가져오기 (첫 번째 의사를 담당의로 설정)
          const doctorRes = await fetch('/api/patient/doctors')
          const doctorData = await doctorRes.json()
          if (doctorData.success && doctorData.doctors.length > 0) {
            setAssignedDoctor(doctorData.doctors[0])
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleCall = () => {
    window.location.href = 'tel:031-123-4567'
  }

  const handleKakaoChat = () => {
    // 카카오톡 채널 상담 링크 (실제 채널 ID로 교체 필요)
    window.open('https://pf.kakao.com/_xYourChannel', '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-20">
      {/* 헤더 */}
      <header className="header-gradient px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-wide text-[#2D3436]">
            MA<span className="text-[#5B9A8B]">R</span>IA
          </h1>
          <Link
            href="/reserve"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5B9A8B] text-white rounded-lg text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            진료 접수
          </Link>
        </div>

        {/* 환영 메시지 */}
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-[#2D3436] mb-1">
            {patient ? `${patient.name}님,` : '안녕하세요,'}
          </h2>
          <p className="text-[#636E72]">
            기적 같은 순간을 위해 최선을 다하겠습니다.
          </p>
        </div>
      </header>

      <main className="px-5 -mt-2">
        {/* 미니 캘린더 */}
        <div className="card mb-4 animate-slide-up">
          <MiniCalendar />
        </div>

        {/* 메모 섹션 */}
        <div className="card mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">메모</h3>
            <button className="section-link flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가하기
            </button>
          </div>
          <p className="text-center text-[#B2BEC3] py-4">
            일정을 등록해주세요
          </p>
        </div>

        {/* 담당의 섹션 */}
        <div className="card mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <h3 className="section-title mb-3">담당의</h3>
          
          <div className="doctor-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#5B9A8B] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#2D3436]">
                  {assignedDoctor ? `${assignedDoctor.name} 부장` : '담당의 배정 대기'}
                </p>
                <p className="text-sm text-[#636E72]">
                  {assignedDoctor?.department || '일산마리아 본원'}
                </p>
              </div>
              <button className="text-sm text-[#636E72] flex items-center gap-1">
                상담 기록 보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <button className="w-full py-3 bg-[#5B9A8B] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#4A8577] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              1:1 상담하기
            </button>
          </div>
        </div>

        {/* 예약 버튼들 */}
        <div className="grid grid-cols-2 gap-3 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleCall}
            className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-[#E8F5F2] rounded-full flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-[#2D3436] font-medium">전화예약</span>
          </button>
          
          <button
            onClick={handleKakaoChat}
            className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-[#FEE500] rounded-full flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-[#191919]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
            </div>
            <span className="text-[#2D3436] font-medium">카톡예약</span>
          </button>
        </div>

        {/* 다른 분원 예약 */}
        <Link
          href="/info"
          className="flex items-center justify-center gap-1 text-[#636E72] py-3 animate-slide-up"
          style={{ animationDelay: '0.25s' }}
        >
          다른 분원 예약하기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* 비로그인 시 카카오 로그인 유도 */}
        {!patient && (
          <div className="card mt-4 text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-[#636E72] mb-3">로그인하고 나만의 건강 기록을 관리하세요</p>
            <Link
              href="/login"
              className="btn-kakao inline-flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오로 시작하기
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
