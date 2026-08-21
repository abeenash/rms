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
  
  // Connect to the REAL backend with the ORIGIN header
  const backendWs = new WebSocket(TARGET_URL, {
    headers: {
      // THIS IS THE MAGIC LINE - it mimics the web browser
      'Origin': 'https://admin.zylobrains.com',
      'User-Agent': 'Mozilla/5.0 (compatible; FOS-Mobile/1.0)',
    },
  });

  let isBackendConnected = false;

  backendWs.on('open', () => {
    console.log('✅ Connected to backend WebSocket');
    isBackendConnected = true;
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
    } else {
      console.log('⏳ Backend not ready, message queued');
    }
  });

  // Handle backend disconnection
  backendWs.on('close', (code, reason) => {
    console.log(`🔌 Backend disconnected: ${code} - ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Backend disconnected');
    }
  });

  // Handle client disconnection
  clientWs.on('close', (code, reason) => {
    console.log(`📱 Client disconnected: ${code} - ${reason}`);
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