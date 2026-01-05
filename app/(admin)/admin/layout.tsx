'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { RealtimeProvider, useRealtime } from '@/contexts/RealtimeContext'

interface UserInfo {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STAFF' | 'DOCTOR'
  doctorId?: string
  department?: string
}

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime()

  // 사용자 정보 조회
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/admin/auth/me')
        const data = await res.json()
        if (data.success) {
          setUserInfo(data.user)
        }
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
      }
    }
    fetchUserInfo()
  }, [])

  // 관리자/스태프 메뉴
  const adminNavItems = [
    { href: '/admin/dashboard', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/reservations', label: '예약 관리', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/admin/daily-changes', label: '전일 변경사항', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { href: '/admin/change-requests', label: '변경 요청', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { href: '/admin/notifications', label: '알림 관리', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { href: '/admin/logs', label: '예약 로그', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/patients', label: '환자 관리', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/admin/doctors', label: '의사 관리', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { href: '/admin/schedule-config', label: '📅 예약 설정표', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { href: '/admin/schedule-templates', label: '스케줄 템플릿', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/admin/schedule-exceptions', label: '예외일 설정', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
  ]

  // 의사 메뉴
  const doctorNavItems = [
    { href: '/admin/my-appointments', label: '내 예약 관리', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ]

  // 역할에 따른 메뉴 선택
  const navItems = userInfo?.role === 'DOCTOR' ? doctorNavItems : adminNavItems

  const handleNavClick = () => {
    setIsSidebarOpen(false)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  const handleNotificationClick = (notification: { id: string; type: string; appointmentId?: string }) => {
    markAsRead(notification.id)
    setIsNotificationOpen(false)
    
    // 알림 타입에 따라 해당 화면으로 이동
    switch (notification.type) {
      case 'CHANGE_REQUEST':
        router.push('/admin/change-requests')
        break
      case 'NEW_APPOINTMENT':
      case 'CANCELLATION':
      case 'STATUS_CHANGE':
      default:
        if (notification.appointmentId) {
          if (userInfo?.role === 'DOCTOR') {
            router.push(`/admin/my-appointments?highlight=${notification.appointmentId}`)
          } else {
            router.push(`/admin/reservations?highlight=${notification.appointmentId}`)
          }
        } else {
          router.push('/admin/reservations')
        }
        break
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 햄버거 메뉴 버튼 (모바일) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 -ml-2 text-[#64748B] hover:text-[#1E293B] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            <div className="w-8 h-8 bg-[#0066CC] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-[#1E293B] text-sm md:text-base">일산마리아병원</h1>
              <p className="text-[10px] md:text-xs text-[#64748B]">
                {userInfo?.role === 'DOCTOR' 
                  ? `${userInfo.name} 선생님` 
                  : '예약 관리 시스템'}
              </p>
            </div>
          </div>

          {/* 알림 버튼 */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* 안 읽은 알림 빨간 점 */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="bg-[#0066CC] text-white px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold">🔔 알림</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-white/80 hover:text-white text-sm"
                    >
                      모두 읽음
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                          !notif.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* 읽지 않은 알림 표시 */}
                          {!notif.isRead && (
                            <span className="w-2 h-2 mt-2 bg-red-500 rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {formatTime(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm">알림이 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* 모바일 오버레이 */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 사이드바 */}
        <aside className={`
          fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-64 bg-white border-r border-gray-200 z-40
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}>
          {/* 사용자 정보 */}
          {userInfo && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0066CC] rounded-full flex items-center justify-center text-white font-bold">
                  {userInfo.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#1E293B] text-sm">{userInfo.name}</p>
                  <p className="text-xs text-[#64748B]">
                    {userInfo.role === 'DOCTOR' ? userInfo.department : 
                     userInfo.role === 'ADMIN' ? '관리자' : '스태프'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-[#0066CC] text-white'
                        : 'text-[#64748B] hover:bg-gray-100 hover:text-[#1E293B]'
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 로그아웃 버튼 (사이드바 하단) */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#DC3545] hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>로그아웃</span>
            </button>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-4 md:p-6 min-h-[calc(100vh-57px)] w-full md:w-auto">
          {children}
        </main>
      </div>

      {/* 알림 드롭다운 외부 클릭 시 닫기 */}
      {isNotificationOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsNotificationOpen(false)}
        />
      )}
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // 로그인 페이지는 레이아웃 없이 렌더링
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <RealtimeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </RealtimeProvider>
  )
}
