'use client'

import Link from 'next/link'
import BottomNav from '@/components/patient/BottomNav'
import { PatientRealtimeProvider } from '@/contexts/PatientRealtimeContext'

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PatientRealtimeProvider>
      <div className="min-h-screen bg-white">
        {/* 상단 헤더 - 마리아 스타일 */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white">
          <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
            {/* MARIA 로고 */}
            <Link href="/" className="flex items-center">
              <span className="text-xl tracking-wider font-light text-[#2D3436]">
                M<span className="text-[#5B9A8B]">A</span>RIA
              </span>
            </Link>

            {/* 진료 접수 버튼 */}
            <Link 
              href="/reserve"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5F2] rounded-lg text-[#5B9A8B] text-sm font-medium hover:bg-[#d8ebe7] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              진료 접수
            </Link>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-lg mx-auto pt-14 pb-20">
          {children}
        </main>

        {/* 하단 네비게이션 */}
        <BottomNav />
      </div>
    </PatientRealtimeProvider>
  )
}
