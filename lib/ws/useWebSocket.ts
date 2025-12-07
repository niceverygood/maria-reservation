'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { getWSClient, WSMessage, MessageType } from './client'

interface UseWebSocketOptions {
  onNewAppointment?: (payload: WSMessage['payload']) => void
  onCancelAppointment?: (payload: WSMessage['payload']) => void
  onStatusUpdate?: (payload: WSMessage['payload']) => void
  onReschedule?: (payload: WSMessage['payload']) => void
  onAnyMessage?: (message: WSMessage) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return

    try {
      const client = getWSClient()
      
      // 연결 시도 (실패해도 에러 없음)
      client.connect()

      // 메시지 핸들러 등록
      const unsubscribe = client.onMessage((message: WSMessage) => {
        const opts = optionsRef.current

        // 모든 메시지 핸들러
        if (opts.onAnyMessage) {
          opts.onAnyMessage(message)
        }

        // 타입별 핸들러
        switch (message.type) {
          case 'CONNECTED':
            setIsConnected(true)
            break
          case 'NEW_APPOINTMENT':
            if (opts.onNewAppointment) {
              opts.onNewAppointment(message.payload)
            }
            break
          case 'CANCEL_APPOINTMENT':
            if (opts.onCancelAppointment) {
              opts.onCancelAppointment(message.payload)
            }
            break
          case 'UPDATE_STATUS':
            if (opts.onStatusUpdate) {
              opts.onStatusUpdate(message.payload)
            }
            break
          case 'RESCHEDULE_APPOINTMENT':
            if (opts.onReschedule) {
              opts.onReschedule(message.payload)
            }
            break
        }
      })

      // 연결 상태 확인 (5초마다)
      const checkConnection = setInterval(() => {
        setIsConnected(client.isConnected())
      }, 5000)

      return () => {
        unsubscribe()
        clearInterval(checkConnection)
      }
    } catch {
      // WebSocket 초기화 실패 시 조용히 무시
    }
  }, [])

  const send = useCallback((type: MessageType, payload: WSMessage['payload']) => {
    try {
      const client = getWSClient()
      client.send(type, payload)
    } catch {
      // 전송 실패 시 조용히 무시
    }
  }, [])

  return {
    isConnected,
    send,
  }
}

/**
 * 관리자 예약 관리 페이지용 훅
 * 예약 리스트를 자동으로 업데이트
 */
export function useAdminRealtimeAppointments<T extends { id: string; status: string }>(
  appointments: T[],
  setAppointments: React.Dispatch<React.SetStateAction<T[]>>,
  refreshDateCounts?: () => void
) {
  useWebSocket({
    onNewAppointment: (payload) => {
      // 새 예약 추가 (현재 보고 있는 날짜와 같으면)
      console.log('새 예약 수신:', payload)
      refreshDateCounts?.()
    },
    onCancelAppointment: (payload) => {
      // 예약 취소
      if (payload?.id) {
        setAppointments(prev => 
          prev.map(apt => apt.id === payload.id ? { ...apt, status: 'CANCELLED' } : apt)
        )
        refreshDateCounts?.()
      }
    },
    onStatusUpdate: (payload) => {
      // 상태 업데이트
      if (payload?.id && payload?.status) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: payload.status as string } : apt)
        )
        refreshDateCounts?.()
      }
    },
    onReschedule: (payload) => {
      // 예약 변경
      console.log('예약 변경 수신:', payload)
      refreshDateCounts?.()
    },
  })
}

/**
 * 환자 마이페이지용 훅
 * 예약 상태 변경을 자동으로 업데이트
 */
export function usePatientRealtimeAppointments<T extends { id: string; status: string }>(
  appointments: T[],
  setAppointments: React.Dispatch<React.SetStateAction<T[]>>
) {
  useWebSocket({
    onStatusUpdate: (payload) => {
      if (payload?.id && payload?.status) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: payload.status as string } : apt)
        )
      }
    },
    onCancelAppointment: (payload) => {
      if (payload?.id) {
        setAppointments(prev =>
          prev.map(apt => apt.id === payload.id ? { ...apt, status: 'CANCELLED' } : apt)
        )
      }
    },
  })
}

