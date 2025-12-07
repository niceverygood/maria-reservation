'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { wsClient, WSMessage } from '@/lib/ws/wsClient'

interface PatientRealtimeContextType {
  lastUpdate: number
  refreshTrigger: number
  forceRefresh: () => void
  isRealtimeConnected: boolean
}

const PatientRealtimeContext = createContext<PatientRealtimeContextType | null>(null)

export function PatientRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const lastCheckedRef = useRef<string | null>(null)

  // 예약 상태 변경 확인 (폴백용)
  const checkAppointmentUpdates = useCallback(async () => {
    try {
      const url = lastCheckedRef.current 
        ? `/api/patient/appointments/updates?lastChecked=${encodeURIComponent(lastCheckedRef.current)}`
        : '/api/patient/appointments/updates?minutes=1'

      const res = await fetch(url)
      if (!res.ok) return
      
      const data = await res.json()

      // 변경사항이 있으면 새로고침 트리거
      if (data.success && data.hasUpdates) {
        setLastUpdate(Date.now())
        setRefreshTrigger(prev => prev + 1)
      }

      lastCheckedRef.current = data.checkedAt
    } catch (error) {
      console.error('예약 상태 확인 오류:', error)
    }
  }, [])

  // WebSocket 메시지 핸들러
  const handleWSMessage = useCallback((data: WSMessage) => {
    console.log('📩 환자 WebSocket 메시지:', data.type)

    // 모든 예약 관련 이벤트에 새로고침
    if (['NEW_APPOINTMENT', 'CANCEL_APPOINTMENT', 'STATUS_CHANGE'].includes(data.type)) {
      setLastUpdate(Date.now())
      setRefreshTrigger(prev => prev + 1)
    }
  }, [])

  // WebSocket 연결
  useEffect(() => {
    // WebSocket 연결
    wsClient.connect('patient')

    // 연결 상태 핸들러
    const unsubConnection = wsClient.onConnection((connected) => {
      setIsRealtimeConnected(connected)
    })

    // 메시지 핸들러
    const unsubMessage = wsClient.onMessage(handleWSMessage)

    // 초기 로드
    checkAppointmentUpdates()

    // 폴백: WebSocket 연결 안 되면 폴링
    const interval = setInterval(() => {
      if (!wsClient.isConnected) {
        checkAppointmentUpdates()
      }
    }, 5000)

    return () => {
      unsubConnection()
      unsubMessage()
      clearInterval(interval)
    }
  }, [handleWSMessage, checkAppointmentUpdates])

  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    setLastUpdate(Date.now())
  }, [])

  return (
    <PatientRealtimeContext.Provider value={{
      lastUpdate,
      refreshTrigger,
      forceRefresh,
      isRealtimeConnected
    }}>
      {children}
    </PatientRealtimeContext.Provider>
  )
}

export function usePatientRealtime() {
  const context = useContext(PatientRealtimeContext)
  if (!context) {
    // Context가 없으면 기본값 반환 (Provider 밖에서 사용될 때)
    return {
      lastUpdate: Date.now(),
      refreshTrigger: 0,
      forceRefresh: () => {},
      isRealtimeConnected: false
    }
  }
  return context
}
