/**
 * 서버 사이드 WebSocket 브로드캐스트 클라이언트
 * API 라우트에서 WebSocket 서버로 메시지를 전송할 때 사용
 * HTTP POST 방식 (Vercel Serverless 호환)
 */

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:8090'
const WS_API_KEY = process.env.WS_API_KEY || 'maria-ws-secret-key'

export type MessageType = 
  | 'NEW_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'STATUS_CHANGE'
  | 'RESCHEDULE_APPOINTMENT'

interface WSPayload {
  id?: string
  doctorId?: string
  date?: string
  time?: string
  patientName?: string
  doctorName?: string
  status?: string
  [key: string]: unknown
}

/**
 * WebSocket 서버로 브로드캐스트 메시지 전송 (HTTP POST)
 * 연결 실패해도 API 응답에 영향 없음
 */
export async function broadcastWSMessage(type: MessageType, payload: WSPayload): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WS_API_KEY
      },
      body: JSON.stringify({ type, ...payload }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log(`📡 브로드캐스트 실패: ${response.status}`)
      return false
    }

    const result = await response.json()
    console.log(`📢 브로드캐스트 성공: ${type} -> ${result.clients}명`)
    return true
  } catch (error) {
    // WebSocket 서버가 없어도 앱은 정상 작동
    if ((error as Error).name === 'AbortError') {
      console.log('📡 브로드캐스트 타임아웃')
    } else {
      console.log('📡 WebSocket 서버 연결 불가 - 브로드캐스트 스킵')
    }
    return false
  }
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
  return broadcastWSMessage('NEW_APPOINTMENT', { appointment: payload })
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
  return broadcastWSMessage('CANCEL_APPOINTMENT', { appointmentId: payload.id, ...payload })
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
  return broadcastWSMessage('STATUS_CHANGE', { appointmentId: payload.id, ...payload })
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
