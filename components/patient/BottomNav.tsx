'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

// 프리페치 캐시
interface PrefetchCache {
  mypage: { data: unknown; timestamp: number } | null
  doctors: { data: unknown; timestamp: number } | null
}

const prefetchCache: PrefetchCache = {
  mypage: null,
  doctors: null,
}
const PREFETCH_TTL = 60000 // 1분

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const prefetchedRef = useRef({ mypage: false, reserve: false })

  // 마이페이지 데이터 프리페치
  const prefetchMypage = useCallback(async () => {
    if (prefetchCache.mypage && Date.now() - prefetchCache.mypage.timestamp < PREFETCH_TTL) return
    if (pathname === '/mypage' || pathname.startsWith('/mypage/')) return

    try {
      const res = await fetch('/api/patient/mypage')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          prefetchCache.mypage = { data, timestamp: Date.now() }
          router.prefetch('/mypage')
        }
      }
    } catch { /* ignore */ }
  }, [pathname, router])

  // 예약 페이지 데이터 프리페치 (의사 목록)
  const prefetchReserve = useCallback(async () => {
    if (prefetchCache.doctors && Date.now() - prefetchCache.doctors.timestamp < PREFETCH_TTL) return
    if (pathname === '/reserve') return

    try {
      const res = await fetch('/api/patient/doctors')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          prefetchCache.doctors = { data, timestamp: Date.now() }
          router.prefetch('/reserve')
        }
      }
    } catch { /* ignore */ }
  }, [pathname, router])

  // 컴포넌트 마운트 시 프리페치
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!prefetchedRef.current.mypage && pathname !== '/mypage') {
        prefetchedRef.current.mypage = true
        prefetchMypage()
      }
      if (!prefetchedRef.current.reserve && pathname !== '/reserve') {
        prefetchedRef.current.reserve = true
        prefetchReserve()
      }
    }, 1500) // 1.5초 후 프리페치

    return () => clearTimeout(timer)
  }, [prefetchMypage, prefetchReserve, pathname])

  const navItems = [
    {
      href: '/reserve',
      label: '예약',
      icon: (active: boolean) => (
        <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onHover: prefetchReserve,
    },
    {
      href: '/mypage',
      label: '마이페이지',
      icon: (active: boolean) => (
        <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onHover: prefetchMypage,
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
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  )
}

// 프리페치된 마이페이지 데이터 가져오기
export function getPrefetchedMypageData() {
  if (prefetchCache.mypage && Date.now() - prefetchCache.mypage.timestamp < PREFETCH_TTL) {
    return prefetchCache.mypage.data
  }
  return null
}

// 프리페치된 의사 목록 가져오기
export function getPrefetchedDoctors() {
  if (prefetchCache.doctors && Date.now() - prefetchCache.doctors.timestamp < PREFETCH_TTL) {
    return prefetchCache.doctors.data
  }
  return null
}

// 프리페치 캐시 초기화
export function clearPrefetchCache() {
  prefetchCache.mypage = null
  prefetchCache.doctors = null
}
