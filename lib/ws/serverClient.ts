/**
 * 서버 사이드 WebSocket 클라이언트
 * API 라우트에서 WebSocket 서버로 메시지를 전송할 때 사용
 */

import WebSocket from 'ws'

const WS_URL = process.env.WS_SERVER_URL || 'ws://localhost:8090'

export type MessageType = 
  | 'NEW_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'UPDATE_STATUS'
  | 'RESCHEDULE_APPOINTMENT'

interface WSPayload {
  id?: string
  doctorId?: string
  date?: string
  time?: string
  patientName?: string
  status?: string
  [key: string]: unknown
}

/**
 * WebSocket 서버로 메시지 전송 (fire-and-forget)
 * 연결 실패해도 API 응답에 영향 없음
 */
export async function broadcastWSMessage(type: MessageType, payload: WSPayload): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_URL)
      
      const timeout = setTimeout(() => {
        ws.close()
        resolve()
      }, 3000) // 3초 타임아웃

      ws.on('open', () => {
        ws.send(JSON.stringify({ type, payload }))
        clearTimeout(timeout)
        ws.close()
        resolve()
      })

      ws.on('error', (error) => {
        console.error('WebSocket 브로드캐스트 실패:', error.message)
        clearTimeout(timeout)
        resolve() // 에러가 발생해도 resolve (API 응답 차단 방지)
      })

      ws.on('close', () => {
        clearTimeout(timeout)
        resolve()
      })
    } catch (error) {
      console.error('WebSocket 연결 실패:', error)
      resolve()
    }
  })
}

/**
 * 새 예약 브로드캐스트
 */
export function broadcastNewAppointment(payload: {
  id: string
  doctorId: string
  date: string
  time: string
  patientName: string
  doctorName?: string
  department?: string
  status?: string
}) {
  return broadcastWSMessage('NEW_APPOINTMENT', payload)
}

/**
 * 예약 취소 브로드캐스트
 */
export function broadcastCancelAppointment(payload: {
  id: string
  doctorId: string
  date: string
  time: string
}) {
  return broadcastWSMessage('CANCEL_APPOINTMENT', payload)
}

/**
 * 상태 변경 브로드캐스트
 */
export function broadcastStatusUpdate(payload: {
  id: string
  status: string
  date: string
  doctorId?: string
}) {
  return broadcastWSMessage('UPDATE_STATUS', payload)
}

/**
 * 예약 변경 브로드캐스트
 */
export function broadcastReschedule(payload: {
  oldId: string
  newId: string
  doctorId: string
  date: string
  time: string
  patientName: string
}) {
  return broadcastWSMessage('RESCHEDULE_APPOINTMENT', payload)
}

