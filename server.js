// Custom Next.js server with WebSocket support
// This file enables WebSocket functionality alongside the Next.js app

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize WebSocket server
  // Note: We'll import this dynamically to avoid issues with ES modules
  import('./src/lib/websocket-server.js').then(({ initializeWebSocketServer }) => {
    initializeWebSocketServer(server)
    console.log('🔌 WebSocket server initialized')
  }).catch(err => {
    console.error('❌ Failed to initialize WebSocket server:', err)
  })

  // Start server
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Server ready on http://${hostname}:${port}`)
    console.log(`🔌 WebSocket available on ws://${hostname}:${port}/ws/market`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully')
    import('./src/lib/websocket-server.js').then(({ shutdown }) => {
      shutdown()
    })
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully')
    import('./src/lib/websocket-server.js').then(({ shutdown }) => {
      shutdown()
    })
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
})
