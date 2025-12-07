'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface PatientRealtimeContextType {
  lastUpdate: number
  refreshTrigger: number
  forceRefresh: () => void
}

const PatientRealtimeContext = createContext<PatientRealtimeContextType | null>(null)

export function PatientRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const lastCheckedRef = useRef<string | null>(null)

  // 예약 상태 변경 확인 (5초마다)
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

  // 5초마다 확인
  useEffect(() => {
    checkAppointmentUpdates()
    const interval = setInterval(checkAppointmentUpdates, 5000)
    return () => clearInterval(interval)
  }, [checkAppointmentUpdates])

  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    setLastUpdate(Date.now())
  }, [])

  return (
    <PatientRealtimeContext.Provider value={{
      lastUpdate,
      refreshTrigger,
      forceRefresh
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
      forceRefresh: () => {}
    }
  }
  return context
}

