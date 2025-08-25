// WebSocket Server for Real-time Trading Data
// Provides real-time updates for order book, trades, and user orders

import { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let wss = null
let supabase = null

// Initialize Supabase client
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

// WebSocket message types
const MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  ORDER_BOOK_UPDATE: 'order_book_update',
  TRADE_UPDATE: 'trade_update',
  USER_ORDER_UPDATE: 'user_order_update',
  PRICE_UPDATE: 'price_update',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat'
}

// Subscription channels
const CHANNELS = {
  ORDER_BOOK: 'order_book',
  TRADES: 'trades',
  USER_ORDERS: 'user_orders',
  DYNAMIC_PRICING: 'dynamic_pricing'
}

// Store client subscriptions
const clientSubscriptions = new Map()

export function initializeWebSocketServer(server) {
  if (wss) {
    console.log('WebSocket server already initialized')
    return wss
  }

  try {
    wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true
    })

    console.log('✅ WebSocket server initialized on /ws')

    wss.on('connection', (ws, request) => {
      const clientId = generateClientId()
      clientSubscriptions.set(clientId, {
        ws,
        subscriptions: new Set(),
        userId: null,
        lastHeartbeat: Date.now()
      })

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
          handleClientMessage(clientId, message)
        } catch (error) {
          console.error('Invalid message format:', error)
          ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            error: 'Invalid message format'
          }))
        }
      })

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`📱 Client disconnected: ${clientId}`)
        clientSubscriptions.delete(clientId)
      })

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error)
        clientSubscriptions.delete(clientId)
      })

      // Set up heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: MESSAGE_TYPES.HEARTBEAT,
            timestamp: new Date().toISOString()
          }))
        } else {
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 30 seconds
    })

    // Set up periodic data updates
    setupPeriodicUpdates()

    return wss

  } catch (error) {
    console.error('❌ Failed to initialize WebSocket server:', error)
    throw error
  }
}

function handleClientMessage(clientId, message) {
  const client = clientSubscriptions.get(clientId)
  if (!client) return

  const { ws } = client

  switch (message.type) {
    case MESSAGE_TYPES.SUBSCRIBE:
      handleSubscription(clientId, message.channel, message.params)
      break

    case MESSAGE_TYPES.UNSUBSCRIBE:
      handleUnsubscription(clientId, message.channel)
      break

    case MESSAGE_TYPES.HEARTBEAT:
      client.lastHeartbeat = Date.now()
      break

    default:
      ws.send(JSON.stringify({
        type: MESSAGE_TYPES.ERROR,
        error: `Unknown message type: ${message.type}`
      }))
  }
}

function handleSubscription(clientId, channel, params = {}) {
  const client = clientSubscriptions.get(clientId)
  if (!client) return

  const { ws } = client

  if (!Object.values(CHANNELS).includes(channel)) {
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      error: `Invalid channel: ${channel}`
    }))
    return
  }

  client.subscriptions.add(channel)
  
  // Store user ID for user-specific channels
  if (params.userId) {
    client.userId = params.userId
  }

  ws.send(JSON.stringify({
    type: 'subscribed',
    channel,
    timestamp: new Date().toISOString()
  }))

  console.log(`📡 Client ${clientId} subscribed to ${channel}`)

  // Send initial data for the channel
  sendInitialChannelData(clientId, channel, params)
}

function handleUnsubscription(clientId, channel) {
  const client = clientSubscriptions.get(clientId)
  if (!client) return

  client.subscriptions.delete(channel)
  
  client.ws.send(JSON.stringify({
    type: 'unsubscribed',
    channel,
    timestamp: new Date().toISOString()
  }))

  console.log(`📡 Client ${clientId} unsubscribed from ${channel}`)
}

async function sendInitialChannelData(clientId, channel, params) {
  const client = clientSubscriptions.get(clientId)
  if (!client || !supabase) return

  try {
    switch (channel) {
      case CHANNELS.ORDER_BOOK:
        // Send current order book
        const orderBookData = await fetchOrderBookData(params)
        if (orderBookData) {
          client.ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ORDER_BOOK_UPDATE,
            data: orderBookData,
            timestamp: new Date().toISOString()
          }))
        }
        break

      case CHANNELS.TRADES:
        // Send recent trades
        const tradesData = await fetchRecentTrades(params)
        if (tradesData) {
          client.ws.send(JSON.stringify({
            type: MESSAGE_TYPES.TRADE_UPDATE,
            data: tradesData,
            timestamp: new Date().toISOString()
          }))
        }
        break

      case CHANNELS.USER_ORDERS:
        // Send user orders (requires userId)
        if (client.userId) {
          const userOrdersData = await fetchUserOrders(client.userId)
          if (userOrdersData) {
            client.ws.send(JSON.stringify({
              type: MESSAGE_TYPES.USER_ORDER_UPDATE,
              data: userOrdersData,
              timestamp: new Date().toISOString()
            }))
          }
        }
        break
    }
  } catch (error) {
    console.error(`Error sending initial data for ${channel}:`, error)
  }
}

function setupPeriodicUpdates() {
  // Temporarily disabled to prevent spam errors
  // TODO: Re-enable when database functions are created

  // Update order book every 5 seconds
  // setInterval(async () => {
  //   await broadcastOrderBookUpdates()
  // }, 5000)

  // Update trades every 10 seconds
  // setInterval(async () => {
  //   await broadcastTradeUpdates()
  // }, 10000)

  // Clean up stale connections every minute
  setInterval(() => {
    cleanupStaleConnections()
  }, 60000)
}

async function broadcastOrderBookUpdates() {
  if (!supabase) return

  try {
    const orderBookData = await fetchOrderBookData()
    if (orderBookData) {
      broadcastToChannel(CHANNELS.ORDER_BOOK, {
        type: MESSAGE_TYPES.ORDER_BOOK_UPDATE,
        data: orderBookData,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error broadcasting order book updates:', error)
  }
}

async function broadcastTradeUpdates() {
  if (!supabase) return

  try {
    const tradesData = await fetchRecentTrades({ limit: 10 })
    if (tradesData) {
      broadcastToChannel(CHANNELS.TRADES, {
        type: MESSAGE_TYPES.TRADE_UPDATE,
        data: tradesData,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error broadcasting trade updates:', error)
  }
}

function broadcastToChannel(channel, message) {
  clientSubscriptions.forEach((client, clientId) => {
    if (client.subscriptions.has(channel) && client.ws.readyState === client.ws.OPEN) {
      try {
        client.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error)
        clientSubscriptions.delete(clientId)
      }
    }
  })
}

function cleanupStaleConnections() {
  const now = Date.now()
  const staleThreshold = 2 * 60 * 1000 // 2 minutes

  clientSubscriptions.forEach((client, clientId) => {
    if (now - client.lastHeartbeat > staleThreshold) {
      console.log(`🧹 Cleaning up stale connection: ${clientId}`)
      try {
        client.ws.close()
      } catch (error) {
        // Ignore errors when closing stale connections
      }
      clientSubscriptions.delete(clientId)
    }
  })
}

// Helper functions for data fetching
async function fetchOrderBookData(params = {}) {
  const baseCurrency = params.baseCurrency || 'EUR'
  const quoteCurrency = params.quoteCurrency || 'AOA'
  
  const { data, error } = await supabase.rpc('get_order_book_depth', {
    p_base_currency: baseCurrency,
    p_quote_currency: quoteCurrency,
    p_depth: 20
  })

  if (error) {
    console.error('Error fetching order book:', error)
    return null
  }

  return data
}

async function fetchRecentTrades(params = {}) {
  const limit = params.limit || 20
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trades:', error)
    return null
  }

  return data
}

async function fetchUserOrders(userId) {
  const { data, error } = await supabase
    .from('order_book')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'partially_filled'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user orders:', error)
    return null
  }

  return data
}

function generateClientId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function getWebSocketServer() {
  return wss
}

export function broadcastMessage(message) {
  if (!wss) return

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error broadcasting message:', error)
      }
    }
  })
}
