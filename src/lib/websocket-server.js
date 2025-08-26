// WebSocket Server for Real-time Trading Data
// Simple JavaScript wrapper for the TypeScript WebSocket server

const { WebSocketServer } = require('ws')

let wss = null

// Simple WebSocket server implementation
function initializeWebSocketServer(server) {
  if (wss) {
    console.log('WebSocket server already initialized')
    return wss
  }

  try {
    wss = new WebSocketServer({ 
      server,
      path: '/ws/market',
      clientTracking: true
    })

    console.log('✅ WebSocket server initialized on /ws/market')

    wss.on('connection', (ws, request) => {
      const clientId = generateClientId()
      console.log(`📱 Client connected: ${clientId}`)

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }))

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          console.log('📨 Received message:', message.type)
          
          // Echo back for now
          ws.send(JSON.stringify({
            type: 'echo',
            data: message,
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Invalid message format:', error)
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }))
        }
      })

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`📱 Client disconnected: ${clientId}`)
      })

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error)
      })
    })

    return wss

  } catch (error) {
    console.error('❌ Failed to initialize WebSocket server:', error)
    throw error
  }
}

function generateClientId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function getWebSocketServer() {
  return wss
}

function shutdown() {
  if (wss) {
    wss.close()
    wss = null
    console.log('🔌 WebSocket server shut down')
  }
}

module.exports = {
  initializeWebSocketServer,
  getWebSocketServer,
  shutdown
}
