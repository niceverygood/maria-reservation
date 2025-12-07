'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from '@/lib/ws/useWebSocket'

interface NotificationItem {
  id: string
  type: 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'CHANGED'
  message: string
  date: string
  time: string
  doctorName?: string
  isRead: boolean
  createdAt: Date
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
  }, [])

  // 로컬 스토리지에서 알림 불러오기
  useEffect(() => {
    if (!isLoggedIn) return
    const stored = localStorage.getItem('patient-notifications')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotifications(parsed.map((n: NotificationItem) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })))
      } catch {
        setNotifications([])
      }
    }
  }, [isLoggedIn])

  // 알림 저장
  const saveNotifications = useCallback((items: NotificationItem[]) => {
    localStorage.setItem('patient-notifications', JSON.stringify(items))
    setNotifications(items)
  }, [])

  // WebSocket으로 실시간 알림 수신
  useWebSocket({
    onStatusUpdate: (payload) => {
      if (!isLoggedIn || !payload) return
      
      let type: NotificationItem['type'] = 'CONFIRMED'
      let message = ''
      
      switch (payload.status) {
        case 'BOOKED':
          type = 'CONFIRMED'
          message = '예약이 확정되었습니다.'
          break
        case 'CANCELLED':
          type = 'CANCELLED'
          message = '예약이 취소되었습니다.'
          break
        case 'REJECTED':
          type = 'REJECTED'
          message = '예약이 거절되었습니다.'
          break
        default:
          return
      }
      
      const newNotification: NotificationItem = {
        id: `${Date.now()}`,
        type,
        message,
        date: (payload.date as string) || '',
        time: (payload.time as string) || '',
        doctorName: payload.doctorName as string | undefined,
        isRead: false,
        createdAt: new Date(),
      }
      
      saveNotifications([newNotification, ...notifications].slice(0, 50))
    },
  })

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.isRead).length

  // 모두 읽음 처리
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }))
    saveNotifications(updated)
  }

  // 알림 삭제
  const clearAll = () => {
    saveNotifications([])
    setIsOpen(false)
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [, month, day] = dateStr.split('-')
    return `${parseInt(month)}월 ${parseInt(day)}일`
  }

  // 시간 경과 포맷
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  // 타입별 아이콘
  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'CONFIRMED':
        return (
          <div className="w-8 h-8 rounded-full bg-[#E8F5F2] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'CANCELLED':
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'REJECTED':
        return (
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      case 'CHANGED':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )
    }
  }

  if (!isLoggedIn) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 종 버튼 */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) markAllAsRead()
        }}
        className="relative p-2 text-[#636E72] hover:text-[#5B9A8B] transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-[#2D3436]">알림</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-[#636E72] hover:text-red-500"
              >
                전체 삭제
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[#B2BEC3]">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-[#F5F9F8]' : ''
                  }`}
                >
                  {getIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3436]">{notification.message}</p>
                    {notification.date && (
                      <p className="text-xs text-[#636E72] mt-0.5">
                        {formatDate(notification.date)} {notification.time}
                        {notification.doctorName && ` · ${notification.doctorName}`}
                      </p>
                    )}
                    <p className="text-xs text-[#B2BEC3] mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

