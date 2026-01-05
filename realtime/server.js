/**
 * WebSocket 실시간 서버
 * 환자 웹과 관리자 웹 간의 실시간 동기화를 담당
 * 
 * 실행: node realtime/server.js
 */

const { WebSocketServer } = require('ws')

const PORT = 8090

// 연결된 클라이언트 목록
const clients = new Set()

// WebSocket 서버 생성
const wss = new WebSocketServer({ port: PORT })

console.log(`🚀 WebSocket 서버가 포트 ${PORT}에서 실행 중...`)

// 모든 클라이언트에게 메시지 브로드캐스트
function broadcast(message, sender) {
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message)
    }
  })
}

// 연결 이벤트 처리
wss.on('connection', (ws) => {
  console.log('✅ 새 클라이언트 연결됨. 총 연결:', clients.size + 1)
  clients.add(ws)

  // 연결 확인 메시지 전송
  ws.send(JSON.stringify({ type: 'CONNECTED', message: '실시간 서버에 연결되었습니다.' }))

  // 메시지 수신 처리
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('📩 메시지 수신:', message.type)

      // 메시지 타입에 따른 처리
      switch (message.type) {
        case 'NEW_APPOINTMENT':
          console.log('📅 새 예약:', message.payload)
          broadcast(JSON.stringify(message), ws)
          break

        case 'CANCEL_APPOINTMENT':
          console.log('❌ 예약 취소:', message.payload)
          broadcast(JSON.stringify(message), ws)
          break

        case 'UPDATE_STATUS':
          console.log('🔄 상태 변경:', message.payload)
          broadcast(JSON.stringify(message), ws)
          break

        case 'RESCHEDULE_APPOINTMENT':
          console.log('📝 예약 변경:', message.payload)
          broadcast(JSON.stringify(message), ws)
          break

        case 'PING':
          // 핑-퐁 (연결 유지)
          ws.send(JSON.stringify({ type: 'PONG' }))
          break

        default:
          console.log('⚠️ 알 수 없는 메시지 타입:', message.type)
      }
    } catch (error) {
      console.error('❌ 메시지 파싱 오류:', error.message)
    }
  })

  // 연결 종료 처리
  ws.on('close', () => {
    clients.delete(ws)
    console.log('🔌 클라이언트 연결 해제됨. 남은 연결:', clients.size)
  })

  // 에러 처리
  ws.on('error', (error) => {
    console.error('❌ WebSocket 에러:', error.message)
    clients.delete(ws)
  })
})

// 서버 에러 처리
wss.on('error', (error) => {
  console.error('❌ 서버 에러:', error.message)
})

// 정상 종료 처리
process.on('SIGINT', () => {
  console.log('\n👋 서버를 종료합니다...')
  wss.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.')
    process.exit(0)
  })
})









