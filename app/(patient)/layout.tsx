'use client'

import Link from 'next/link'
import BottomNav from '@/components/patient/BottomNav'
import NotificationBell from '@/components/patient/NotificationBell'
import { PatientRealtimeProvider } from '@/contexts/PatientRealtimeContext'

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PatientRealtimeProvider>
      <div className="min-h-screen bg-[#F5F9F8]">
        {/* 상단 헤더 */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            {/* 로고/병원명 */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#5B9A8B] to-[#4A8577] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              <span className="font-bold text-[#2D3436] text-sm">일산마리아병원</span>
            </Link>

            {/* 알림 버튼 */}
            <NotificationBell />
          </div>
        </header>

        {/* 메인 콘텐츠 (헤더 높이만큼 패딩) */}
        <main className="max-w-lg mx-auto pt-14">
          {children}
        </main>

        {/* 하단 네비게이션 */}
        <BottomNav />
      </div>
    </PatientRealtimeProvider>
  )
}
