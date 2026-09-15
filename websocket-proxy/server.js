// websocket-proxy/server.js
const WebSocket = require('ws');
const http = require('http');

const TARGET_URL = 'wss://api.zylobrains.com/api/v1/ws';
const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check for Render
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end('WebSocket proxy only');
});

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
});

console.log(`🚀 WebSocket proxy starting...`);
console.log(`📡 Target: ${TARGET_URL}`);

wss.on('connection', (clientWs, req) => {
  console.log(`📱 Mobile client connected from: ${req.socket.remoteAddress}`);

  // Forward the STOMP subprotocol from client to backend
  const clientProtocols = req.headers['sec-websocket-protocol'];
  const protocols = clientProtocols
    ? clientProtocols.split(',').map(p => p.trim())
    : ['v12.stomp', 'v11.stomp', 'v10.stomp'];

  console.log(`📋 Client subprotocols: ${clientProtocols || '(none)'}`);
  console.log(`Client requested protocols: `, req.headers['sec-websocket-protocol']);
  console.log(`📋 Forwarding protocols: ${protocols.join(', ')}`);

  // Connect to the REAL backend with the ORIGIN header and subprotocol
  const backendWs = new WebSocket(TARGET_URL, protocols, {
    headers: {
      'Origin': 'https://admin.zylobrains.com',
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible; FOS-Mobile/1.0)',
    },
  });

  let isBackendConnected = false;
  const pendingMessages = [];

  // Timeout if backend doesn't connect within 10 seconds
  const connectTimeout = setTimeout(() => {
    if (!isBackendConnected) {
      console.error('❌ Backend connection timed out');
      backendWs.terminate();
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Backend connection timed out');
      }
    }
  }, 10000);

  backendWs.on('open', () => {
    console.log('✅ Connected to backend WebSocket');
    console.log('Backend subprotocol:', backendWs.protocol);
    isBackendConnected = true;
    clearTimeout(connectTimeout);

    // Flush any messages that arrived before backend was ready
    for (const msg of pendingMessages) {
      backendWs.send(msg);
    }
    pendingMessages.length = 0;
  });

  // Forward messages: Backend → Client
  backendWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Forward messages: Client → Backend
  clientWs.on('message', (data) => {
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.send(data);
    } else if (isBackendConnected === false) {
      pendingMessages.push(data);
      if (pendingMessages.length > 50) {
        console.warn('⚠️ Message queue full, dropping oldest');
        pendingMessages.shift();
      }
    }
  });

  // Handle backend connection error (e.g. DNS failure, connection refused)
  backendWs.on('unexpected-response', (req, res) => {
    console.error(`❌ Backend rejected connection: HTTP ${res.statusCode}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, `Backend returned HTTP ${res.statusCode}`);
    }
  });

  // Handle backend disconnection
  backendWs.on('close', (code, reason) => {
    const reasonStr = reason ? reason.toString() : '(no reason)';
    console.log(`🔌 Backend disconnected: code=${code} reason=${reasonStr}`);
    clearTimeout(connectTimeout);
    pendingMessages.length = 0;
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Backend disconnected');
    }
  });

  // Handle client disconnection
  clientWs.on('close', (code, reason) => {
    const reasonStr = reason ? reason.toString() : '(no reason)';
    console.log(`📱 Client disconnected: code=${code} reason=${reasonStr}`);
    clearTimeout(connectTimeout);
    pendingMessages.length = 0;
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.close();
    }
  });

  // Handle errors
  clientWs.on('error', (error) => {
    console.error('❌ Client error:', error.message);
  });

  backendWs.on('error', (error) => {
    console.error('❌ Backend error:', error.message);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ WebSocket proxy running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down proxy...');
  wss.close(() => {
    process.exit(0);
  });
});