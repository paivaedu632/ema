// EmaPay WebSocket Server
// Real-time market data streaming infrastructure

import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { 
  WebSocketMessage, 
  WebSocketMessageType, 
  CurrencyPair,
  MarketDataSubscription 
} from '@/types/market-data'
import { 
  getMarketTicker, 
  getOrderBookSnapshot, 
  getRecentTradesForPair 
} from '@/lib/market-data-service'

/**
 * WebSocket client connection with subscription info
 */
interface WebSocketClient {
  /** WebSocket connection */
  ws: WebSocket
  /** Client ID */
  id: string
  /** Active subscriptions */
  subscriptions: Set<string>
  /** Connection timestamp */
  connectedAt: Date
  /** Last heartbeat */
  lastHeartbeat: Date
  /** Client IP address */
  ip: string
}

/**
 * Subscription key format: {pair}:{channel}
 */
type SubscriptionKey = string

/**
 * WebSocket server manager
 */
class WebSocketManager {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WebSocketClient> = new Map()
  private subscriptions: Map<SubscriptionKey, Set<string>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private marketDataInterval: NodeJS.Timeout | null = null

  /**
   * Initialize WebSocket server
   */
  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/market',
      clientTracking: true
    })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.startHeartbeat()
    this.startMarketDataBroadcast()

    console.log('🔌 WebSocket server initialized on /ws/market')
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const clientId = this.generateClientId()
    const ip = request.socket.remoteAddress || 'unknown'

    const client: WebSocketClient = {
      ws,
      id: clientId,
      subscriptions: new Set(),
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      ip
    }

    this.clients.set(clientId, client)

    console.log(`📱 Client connected: ${clientId} from ${ip}`)

    // Send welcome message
    this.sendMessage(client, {
      type: 'heartbeat',
      data: { 
        message: 'Connected to EmaPay WebSocket',
        clientId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(client, data)
    })

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    })
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(client: WebSocketClient, data: any) {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(client, message)
          break
        case 'unsubscribe':
          this.handleUnsubscribe(client, message)
          break
        case 'heartbeat':
          this.handleHeartbeat(client)
          break
        default:
          this.sendError(client, `Unknown message type: ${message.type}`)
      }
    } catch (error) {
      this.sendError(client, 'Invalid JSON message')
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscribe(client: WebSocketClient, message: WebSocketMessage) {
    const { pair, data } = message
    
    if (!pair || !data?.channels) {
      this.sendError(client, 'Missing pair or channels in subscription')
      return
    }

    const channels = Array.isArray(data.channels) ? data.channels : [data.channels]

    channels.forEach((channel: string) => {
      const subscriptionKey = `${pair}:${channel}`
      
      // Add client to subscription
      if (!this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.set(subscriptionKey, new Set())
      }
      this.subscriptions.get(subscriptionKey)!.add(client.id)
      client.subscriptions.add(subscriptionKey)
    })

    // Send confirmation
    this.sendMessage(client, {
      type: 'subscribe',
      pair,
      data: { 
        status: 'subscribed',
        channels,
        subscriptions: Array.from(client.subscriptions)
      },
      timestamp: new Date().toISOString()
    })

    console.log(`📊 Client ${client.id} subscribed to ${pair} channels: ${channels.join(', ')}`)
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage) {
    const { pair, data } = message
    
    if (!pair || !data?.channels) {
      this.sendError(client, 'Missing pair or channels in unsubscription')
      return
    }

    const channels = Array.isArray(data.channels) ? data.channels : [data.channels]

    channels.forEach((channel: string) => {
      const subscriptionKey = `${pair}:${channel}`
      
      // Remove client from subscription
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey)!.delete(client.id)
        
        // Clean up empty subscriptions
        if (this.subscriptions.get(subscriptionKey)!.size === 0) {
          this.subscriptions.delete(subscriptionKey)
        }
      }
      client.subscriptions.delete(subscriptionKey)
    })

    // Send confirmation
    this.sendMessage(client, {
      type: 'unsubscribe',
      pair,
      data: { 
        status: 'unsubscribed',
        channels,
        subscriptions: Array.from(client.subscriptions)
      },
      timestamp: new Date().toISOString()
    })

    console.log(`📊 Client ${client.id} unsubscribed from ${pair} channels: ${channels.join(', ')}`)
  }

  /**
   * Handle heartbeat from client
   */
  private handleHeartbeat(client: WebSocketClient) {
    client.lastHeartbeat = new Date()
    
    this.sendMessage(client, {
      type: 'heartbeat',
      data: { pong: true },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Remove from all subscriptions
    client.subscriptions.forEach(subscriptionKey => {
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey)!.delete(clientId)
        
        // Clean up empty subscriptions
        if (this.subscriptions.get(subscriptionKey)!.size === 0) {
          this.subscriptions.delete(subscriptionKey)
        }
      }
    })

    this.clients.delete(clientId)
    console.log(`📱 Client disconnected: ${clientId}`)
  }

  /**
   * Send message to specific client
   */
  private sendMessage(client: WebSocketClient, message: WebSocketMessage) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Send error message to client
   */
  private sendError(client: WebSocketClient, error: string) {
    this.sendMessage(client, {
      type: 'error',
      data: { error },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  private broadcast(pair: CurrencyPair, channel: string, data: any) {
    const subscriptionKey = `${pair}:${channel}`
    const subscribers = this.subscriptions.get(subscriptionKey)
    
    if (!subscribers || subscribers.size === 0) return

    const message: WebSocketMessage = {
      type: `${channel}_update` as WebSocketMessageType,
      pair,
      data,
      timestamp: new Date().toISOString(),
      sequence: Date.now()
    }

    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId)
      if (client) {
        this.sendMessage(client, message)
      }
    })
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date()
      const timeout = 60000 // 1 minute timeout

      this.clients.forEach((client, clientId) => {
        const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime()
        
        if (timeSinceHeartbeat > timeout) {
          console.log(`💔 Client ${clientId} timed out`)
          client.ws.terminate()
          this.handleDisconnection(clientId)
        }
      })
    }, 30000) // Check every 30 seconds
  }

  /**
   * Start market data broadcast interval
   */
  private startMarketDataBroadcast() {
    this.marketDataInterval = setInterval(async () => {
      await this.broadcastMarketData()
    }, 5000) // Broadcast every 5 seconds
  }

  /**
   * Broadcast market data updates
   */
  private async broadcastMarketData() {
    const pairs: CurrencyPair[] = ['EUR-AOA', 'AOA-EUR']

    for (const pair of pairs) {
      try {
        // Broadcast ticker updates
        if (this.subscriptions.has(`${pair}:ticker`)) {
          const ticker = await getMarketTicker(pair)
          this.broadcast(pair, 'ticker', ticker)
        }

        // Broadcast order book updates
        if (this.subscriptions.has(`${pair}:orderbook`)) {
          const orderbook = await getOrderBookSnapshot(pair, 20)
          this.broadcast(pair, 'orderbook', orderbook)
        }

        // Broadcast recent trades
        if (this.subscriptions.has(`${pair}:trades`)) {
          const trades = await getRecentTradesForPair(pair, 10)
          this.broadcast(pair, 'trades', trades)
        }

      } catch (error) {
        console.error(`❌ Error broadcasting market data for ${pair}:`, error)
      }
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
      subscriptionDetails: Array.from(this.subscriptions.entries()).map(([key, clients]) => ({
        subscription: key,
        clientCount: clients.size
      }))
    }
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval)
    }

    this.clients.forEach(client => {
      client.ws.terminate()
    })

    if (this.wss) {
      this.wss.close()
    }

    console.log('🔌 WebSocket server shutdown')
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager()
export default websocketManager

// CommonJS compatibility for custom server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { websocketManager, WebSocketManager }
}
