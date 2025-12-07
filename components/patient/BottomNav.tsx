'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

// 프리페치 캐시
let prefetchCache: { data: unknown; timestamp: number } | null = null
const PREFETCH_TTL = 60000 // 1분

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const prefetchedRef = useRef(false)

  // 마이페이지 데이터 프리페치
  const prefetchMypage = useCallback(async () => {
    // 이미 프리페치했으면 스킵
    if (prefetchCache && Date.now() - prefetchCache.timestamp < PREFETCH_TTL) {
      return
    }
    
    // 마이페이지가 아닐 때만 프리페치
    if (pathname === '/mypage' || pathname.startsWith('/mypage/')) {
      return
    }

    try {
      const res = await fetch('/api/patient/mypage')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          prefetchCache = { data, timestamp: Date.now() }
          // Next.js 라우터 프리페치
          router.prefetch('/mypage')
        }
      }
    } catch {
      // 프리페치 실패는 무시
    }
  }, [pathname, router])

  // 컴포넌트 마운트 시 프리페치
  useEffect(() => {
    if (!prefetchedRef.current && pathname !== '/mypage') {
      prefetchedRef.current = true
      // 1초 후 프리페치 (초기 로딩 방해 안 하도록)
      const timer = setTimeout(prefetchMypage, 1000)
      return () => clearTimeout(timer)
    }
  }, [prefetchMypage, pathname])

  const navItems = [
    {
      href: '/reserve',
      label: '예약',
      icon: (active: boolean) => (
        <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/mypage',
      label: '마이페이지',
      icon: (active: boolean) => (
        <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onHover: prefetchMypage, // 호버 시 프리페치
    },
  ]

  const isActive = (href: string) => {
    if (href === '/reserve') return pathname === '/reserve' || pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DFE6E9] z-50">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={item.onHover}
                onTouchStart={item.onHover}
                className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${
                  active ? 'text-[#5B9A8B]' : 'text-[#B2BEC3]'
                }`}
              >
                {item.icon(active)}
                <span className={`text-xs mt-1 font-medium ${active ? 'text-[#5B9A8B]' : 'text-[#B2BEC3]'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      {/* iOS Safe Area */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  )
}

// 프리페치된 데이터 가져오기 (마이페이지에서 사용)
export function getPrefetchedMypageData() {
  if (prefetchCache && Date.now() - prefetchCache.timestamp < PREFETCH_TTL) {
    return prefetchCache.data
  }
  return null
}

// 프리페치 캐시 초기화
export function clearPrefetchCache() {
  prefetchCache = null
}
