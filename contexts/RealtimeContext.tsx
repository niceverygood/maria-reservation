'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  appointmentId?: string
  isRead: boolean
  createdAt: string
}

interface NewAppointment {
  id: string
  patientName: string
  patientPhone: string
  doctorName: string
  department: string
  date: string
  time: string
  reservedAt: string
}

interface RealtimeContextType {
  notifications: Notification[]
  unreadCount: number
  newAppointments: NewAppointment[]
  lastUpdate: number
  dismissNotification: (id: string) => void
  dismissAll: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refreshTrigger: number
  forceRefresh: () => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [newAppointments, setNewAppointments] = useState<NewAppointment[]>([])
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // 안 읽은 알림 수
  const unreadCount = notifications.filter(n => !n.isRead).length

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true)
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted')
        })
      }
    }
  }, [])

  // 브라우저 알림 표시
  const showBrowserNotification = useCallback((appointment: NewAppointment) => {
    if (hasPermission && 'Notification' in window) {
      const notification = new Notification('🔔 새 예약이 접수되었습니다!', {
        body: `${appointment.patientName}님 - ${appointment.doctorName} (${appointment.date} ${appointment.time})`,
        icon: '/favicon.ico',
        tag: appointment.id,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      setTimeout(() => notification.close(), 5000)
    }
  }, [hasPermission])

  // 알림음 재생
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const audioContext = audioContextRef.current
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2)

      setTimeout(() => {
        const osc2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        osc2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        osc2.frequency.value = 1000
        osc2.type = 'sine'
        gainNode2.gain.value = 0.3
        osc2.start()
        osc2.stop(audioContext.currentTime + 0.2)
      }, 200)
    } catch (e) {
      console.log('알림음 재생 실패:', e)
    }
  }, [])

  // 새 예약 및 변경 확인 (3초마다)
  const checkNewAppointments = useCallback(async () => {
    try {
      const url = lastChecked 
        ? `/api/admin/appointments/new?lastChecked=${encodeURIComponent(lastChecked)}`
        : '/api/admin/appointments/new?minutes=5'

      const res = await fetch(url)
      if (!res.ok) return
      
      const data = await res.json()

      // 새 예약이 있는 경우
      if (data.success && data.count > 0) {
        const existingIds = new Set(newAppointments.map(a => a.id))
        const newOnes = data.appointments.filter((a: NewAppointment) => !existingIds.has(a.id))
        
        if (newOnes.length > 0) {
          // 새 예약을 알림 목록에 추가
          const newNotifications: Notification[] = newOnes.map((apt: NewAppointment) => ({
            id: `notif-${apt.id}`,
            type: 'NEW_APPOINTMENT',
            title: '새 예약 접수',
            message: `${apt.patientName}님 - ${apt.doctorName} (${apt.date} ${apt.time})`,
            appointmentId: apt.id,
            isRead: false,
            createdAt: apt.reservedAt,
          }))

          setNotifications(prev => [...newNotifications, ...prev].slice(0, 50))
          setNewAppointments(prev => [...newOnes, ...prev].slice(0, 20))
          
          // 브라우저 알림 표시
          newOnes.forEach(showBrowserNotification)
          // 알림음 재생
          playNotificationSound()
          // 새로고침 트리거
          setLastUpdate(Date.now())
          setRefreshTrigger(prev => prev + 1)
        }
      }

      // 기존 예약에 변경사항이 있는 경우 (취소, 변경 등) - 알림 없이 데이터만 새로고침
      if (data.success && data.hasChanges) {
        setLastUpdate(Date.now())
        setRefreshTrigger(prev => prev + 1)
      }

      setLastChecked(data.checkedAt)
    } catch (error) {
      console.error('새 예약 확인 오류:', error)
    }
  }, [lastChecked, newAppointments, showBrowserNotification, playNotificationSound])

  // 3초마다 확인 (실시간 동기화)
  useEffect(() => {
    checkNewAppointments()
    const interval = setInterval(checkNewAppointments, 3000)
    return () => clearInterval(interval)
  }, [checkNewAppointments])

  const dismissNotification = (id: string) => {
    setNewAppointments(prev => prev.filter(a => a.id !== id))
    setNotifications(prev => prev.filter(n => n.id !== id && n.id !== `notif-${id}`))
  }

  const dismissAll = () => {
    setNewAppointments([])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const forceRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <RealtimeContext.Provider value={{
      notifications,
      unreadCount,
      newAppointments,
      lastUpdate,
      dismissNotification,
      dismissAll,
      markAsRead,
      markAllAsRead,
      refreshTrigger,
      forceRefresh
    }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
