// WebSocket Test Page
// Test page for WebSocket functionality

import WebSocketTest from '@/components/WebSocketTest'

export default function WebSocketTestPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            EmaPay WebSocket Test
          </h1>
          <p className="text-gray-600">
            Test real-time market data streaming functionality
          </p>
        </div>
        
        <WebSocketTest />
        
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">WebSocket API Documentation</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Connection</h3>
              <p className="text-gray-600 mb-2">Connect to: <code className="bg-gray-100 px-2 py-1 rounded">ws://localhost:3001/ws/market</code></p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Message Types</h3>
              <ul className="space-y-1 text-gray-600">
                <li><strong>subscribe:</strong> Subscribe to market data channels</li>
                <li><strong>unsubscribe:</strong> Unsubscribe from market data channels</li>
                <li><strong>heartbeat:</strong> Keep connection alive</li>
                <li><strong>ticker_update:</strong> Real-time ticker updates</li>
                <li><strong>orderbook_update:</strong> Real-time order book updates</li>
                <li><strong>trade_update:</strong> Real-time trade updates</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Subscription Example</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "type": "subscribe",
  "pair": "EUR-AOA",
  "data": {
    "channels": ["ticker", "orderbook", "trades"]
  },
  "timestamp": "2025-08-23T14:30:00.000Z"
}`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Update Example</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "type": "ticker_update",
  "pair": "EUR-AOA",
  "data": {
    "bid": 1200.50,
    "ask": 1205.00,
    "lastPrice": 1202.75,
    "volume24h": 1500.00
  },
  "timestamp": "2025-08-23T14:30:00.000Z",
  "sequence": 1692801000000
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
