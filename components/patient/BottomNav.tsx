'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        setIsLoggedIn(data.success)
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkAuth()
  }, [pathname])

  // 공통 네비게이션 아이템
  const navItems = [
    {
      href: '/',
      label: '홈',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#0066CC]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      href: '/reserve',
      label: '예약',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#0066CC]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      href: '/info',
      label: '병원안내',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#0066CC]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      href: '/mypage',
      label: '마이',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#0066CC]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
  ]

  // 현재 상태에 맞는 아이템만 필터링
  const visibleItems = navItems.filter(item => 
    isLoggedIn ? item.showWhenLoggedIn : item.showWhenLoggedOut
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center py-2 px-3 transition-colors"
              >
                {item.icon(isActive)}
                <span className={`text-xs mt-1 ${isActive ? 'text-[#0066CC] font-medium' : 'text-[#94A3B8]'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  )
}
