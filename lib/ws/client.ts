/**
 * WebSocket 클라이언트 모듈
 * 환자 웹과 관리자 웹에서 실시간 동기화에 사용
 * 
 * WebSocket 서버가 없으면 조용히 실패하고 폴링 방식으로 대체됨
 */

// WebSocket 서버 URL
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

// WebSocket 기능 항상 활성화
const WS_ENABLED = true

// 메시지 타입 정의
export type MessageType = 
  | 'CONNECTED'
  | 'NEW_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'UPDATE_STATUS'
  | 'RESCHEDULE_APPOINTMENT'
  | 'PING'
  | 'PONG'

export interface WSMessage {
  type: MessageType
  payload?: {
    id?: string
    doctorId?: string
    date?: string
    time?: string
    patientName?: string
    status?: string
    [key: string]: unknown
  }
  message?: string
}

type MessageHandler = (data: WSMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000
  private isConnecting = false
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // 브라우저 환경에서만 자동 연결
    if (typeof window !== 'undefined' && WS_ENABLED) {
      // 약간의 딜레이 후 연결 (페이지 로드 완료 후)
      setTimeout(() => this.connect(), 500)
    }
  }

  connect(): WebSocket | null {
    // 서버 사이드에서는 연결하지 않음
    if (typeof window === 'undefined' || !WS_ENABLED) {
      return null
    }

    // 이미 연결 중이거나 연결된 상태면 기존 연결 반환
    if (this.isConnecting) {
      return this.ws
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log('✅ WebSocket 연결됨')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startPing()
      }

      this.ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data)
          this.messageHandlers.forEach((handler) => handler(data))
        } catch {
          // 파싱 오류는 무시
        }
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket 연결 해제됨, 재연결 시도...')
        this.isConnecting = false
        this.stopPing()
        this.attemptReconnect()
      }

      this.ws.onerror = () => {
        // 에러는 onclose에서 처리됨
        this.isConnecting = false
      }

      return this.ws
    } catch (e) {
      console.error('WebSocket 연결 실패:', e)
      this.isConnecting = false
      this.attemptReconnect()
      return null
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('⚠️ WebSocket 최대 재연결 시도 초과, 폴링 모드로 전환')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000)
    
    console.log(`${delay / 1000}초 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('PING', {})
      }
    }, 30000)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  send(type: MessageType, payload: WSMessage['payload']) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
    // 연결 안됐으면 조용히 무시
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  disconnect() {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// 싱글톤 인스턴스
let wsClient: WebSocketClient | null = null

export function getWSClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}

// 편의 함수들
export function connectWebSocket(): WebSocket | null {
  return getWSClient().connect()
}

export function sendWSMessage(type: MessageType, payload: WSMessage['payload']) {
  getWSClient().send(type, payload)
}

export function onWSMessage(handler: MessageHandler) {
  return getWSClient().onMessage(handler)
}

export function disconnectWebSocket() {
  getWSClient().disconnect()
}

