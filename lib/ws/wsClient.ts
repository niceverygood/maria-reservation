'use client'

type MessageHandler = (data: WSMessage) => void
type ConnectionHandler = (connected: boolean) => void

export interface WSMessage {
  type: string
  [key: string]: unknown
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3  // 재연결 시도 줄임
  private reconnectDelay = 5000     // 재연결 간격 늘림
  private messageHandlers: Set<MessageHandler> = new Set()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  private clientType: 'admin' | 'patient' = 'patient'
  private userId?: string
  private pingInterval: NodeJS.Timeout | null = null
  private isIntentionallyClosed = false

  constructor() {
    // 환경변수에서 WebSocket URL 가져오기
    this.url = typeof window !== 'undefined' 
      ? (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090')
      : ''
  }

  connect(clientType: 'admin' | 'patient', userId?: string) {
    if (typeof window === 'undefined') return
    if (this.ws?.readyState === WebSocket.OPEN) return
    
    // WebSocket URL이 설정되지 않았으면 연결 안 함 (폴링으로 대체)
    if (!this.url || !process.env.NEXT_PUBLIC_WS_URL) {
      return
    }

    this.clientType = clientType
    this.userId = userId
    this.isIntentionallyClosed = false

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.notifyConnectionHandlers(true)

        // 클라이언트 등록
        this.send({
          type: 'register',
          clientType: this.clientType,
          userId: this.userId
        })

        // 핑 시작
        this.startPing()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage
          this.notifyMessageHandlers(data)
        } catch (e) {
          console.error('WebSocket 메시지 파싱 오류:', e)
        }
      }

      this.ws.onclose = () => {
        this.notifyConnectionHandlers(false)
        this.stopPing()

        // 의도적 종료가 아니면 재연결
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        // WebSocket 서버 없으면 조용히 실패 (프로덕션에서 정상)
      }
    } catch {
      // WebSocket 서버 없으면 조용히 실패
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      // 최대 재연결 시도 초과 - 조용히 포기 (폴링으로 폴백)
      return
    }
    
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    
    setTimeout(() => {
      this.connect(this.clientType, this.userId)
    }, delay)
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, 25000) // 25초마다 핑
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true
    this.stopPing()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
  }

  send(data: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  private notifyMessageHandlers(data: WSMessage) {
    this.messageHandlers.forEach(handler => handler(data))
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected))
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 싱글톤 인스턴스
export const wsClient = new WebSocketClient()

