'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

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
