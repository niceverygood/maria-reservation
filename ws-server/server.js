const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || process.env.WS_PORT || 8090;
const API_KEY = process.env.WS_API_KEY || 'maria-ws-secret-key';

// HTTP 서버 생성 (헬스체크용)
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size }));
    return;
  }
  
  // POST /broadcast - 브로드캐스트 엔드포인트
  if (req.method === 'POST' && req.url === '/broadcast') {
    const authHeader = req.headers['x-api-key'];
    if (authHeader !== API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        broadcast(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, clients: wss.clients.size }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// 클라이언트 타입 (admin 또는 patient)
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  const clientIp = req.socket.remoteAddress;
  
  console.log(`✅ 새 연결: ${clientId} (${clientIp})`);
  
  // 클라이언트 정보 저장
  clients.set(ws, { id: clientId, type: 'unknown', connectedAt: new Date() });

  // 연결 성공 메시지
  ws.send(JSON.stringify({ 
    type: 'connected', 
    clientId,
    message: '마리아병원 실시간 서버 연결됨'
  }));

  // 메시지 수신
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📩 메시지 수신 (${clientId}):`, message.type);

      // 클라이언트 등록 (admin 또는 patient)
      if (message.type === 'register') {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          clientInfo.type = message.clientType || 'unknown';
          clientInfo.userId = message.userId;
          console.log(`📝 클라이언트 등록: ${clientId} -> ${clientInfo.type}`);
        }
        return;
      }

      // 핑/퐁
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

    } catch (e) {
      console.error('메시지 파싱 오류:', e);
    }
  });

  // 연결 종료
  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    console.log(`❌ 연결 종료: ${clientInfo?.id} (${clientInfo?.type})`);
    clients.delete(ws);
  });

  // 에러 처리
  ws.on('error', (error) => {
    console.error(`⚠️ WebSocket 에러 (${clientId}):`, error.message);
  });
});

// 브로드캐스트 함수
function broadcast(message, targetType = null) {
  const payload = JSON.stringify(message);
  let sent = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clients.get(client);
      
      // 특정 타입에게만 전송 (targetType이 지정된 경우)
      if (targetType && clientInfo?.type !== targetType) {
        return;
      }

      client.send(payload);
      sent++;
    }
  });

  console.log(`📢 브로드캐스트: ${message.type} -> ${sent}명에게 전송`);
  return sent;
}

// 서버 시작
server.listen(PORT, () => {
  console.log('');
  console.log('🏥 ========================================');
  console.log('🏥  마리아병원 WebSocket 서버');
  console.log('🏥 ========================================');
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`❤️  헬스체크: http://localhost:${PORT}/health`);
  console.log('🏥 ========================================');
  console.log('');
});

// 30초마다 클라이언트 상태 출력
setInterval(() => {
  const adminCount = [...clients.values()].filter(c => c.type === 'admin').length;
  const patientCount = [...clients.values()].filter(c => c.type === 'patient').length;
  console.log(`📊 연결 현황: 관리자 ${adminCount}명, 환자 ${patientCount}명 (총 ${wss.clients.size}명)`);
}, 30000);

// 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  server.close(() => {
    console.log('👋 서버 종료 완료');
    process.exit(0);
  });
});

