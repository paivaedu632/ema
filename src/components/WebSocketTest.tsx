// WebSocket Test Component
// Test component for WebSocket functionality

'use client'

import { useState, useEffect, useRef } from 'react'
import { WebSocketMessage, CurrencyPair } from '@/types/market-data'

interface WebSocketTestProps {
  wsUrl?: string
}

export default function WebSocketTest({ wsUrl = 'ws://localhost:3001/ws/market' }: WebSocketTestProps) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [subscriptions, setSubscriptions] = useState<string[]>([])
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>('EUR-AOA')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['ticker'])
  
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const connect = () => {
    try {
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        setConnected(true)
        addMessage({
          type: 'heartbeat',
          data: { message: 'Connected to WebSocket' },
          timestamp: new Date().toISOString()
        })
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          addMessage(message)
          
          // Update subscriptions if this is a subscription response
          if (message.type === 'subscribe' && message.data?.subscriptions) {
            setSubscriptions(message.data.subscriptions)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = () => {
        setConnected(false)
        setSubscriptions([])
        addMessage({
          type: 'heartbeat',
          data: { message: 'Disconnected from WebSocket' },
          timestamp: new Date().toISOString()
        })
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        addMessage({
          type: 'error',
          data: { error: 'WebSocket connection error' },
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const subscribe = () => {
    if (wsRef.current && connected) {
      const message: WebSocketMessage = {
        type: 'subscribe',
        pair: selectedPair,
        data: { channels: selectedChannels },
        timestamp: new Date().toISOString()
      }
      
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const unsubscribe = () => {
    if (wsRef.current && connected) {
      const message: WebSocketMessage = {
        type: 'unsubscribe',
        pair: selectedPair,
        data: { channels: selectedChannels },
        timestamp: new Date().toISOString()
      }
      
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const sendHeartbeat = () => {
    if (wsRef.current && connected) {
      const message: WebSocketMessage = {
        type: 'heartbeat',
        data: { ping: true },
        timestamp: new Date().toISOString()
      }
      
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const addMessage = (message: WebSocketMessage) => {
    setMessages(prev => [message, ...prev.slice(0, 49)]) // Keep last 50 messages
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">WebSocket Test Client</h2>
      
      {/* Connection Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Connection</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-sm text-gray-500">{wsUrl}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={connect}
            disabled={connected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!connected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Disconnect
          </button>
          <button
            onClick={sendHeartbeat}
            disabled={!connected}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Heartbeat
          </button>
        </div>
      </div>

      {/* Subscription Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Subscriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Currency Pair</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value as CurrencyPair)}
              className="w-full p-2 border rounded"
            >
              <option value="EUR-AOA">EUR-AOA</option>
              <option value="AOA-EUR">AOA-EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Channels</label>
            <div className="space-y-2">
              {['ticker', 'orderbook', 'trades', 'stats'].map(channel => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChannels(prev => [...prev, channel])
                      } else {
                        setSelectedChannels(prev => prev.filter(c => c !== channel))
                      }
                    }}
                    className="mr-2"
                  />
                  {channel}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={subscribe}
            disabled={!connected || selectedChannels.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Subscribe
          </button>
          <button
            onClick={unsubscribe}
            disabled={!connected || selectedChannels.length === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300"
          >
            Unsubscribe
          </button>
        </div>
        {subscriptions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Active Subscriptions:</p>
            <div className="flex flex-wrap gap-2">
              {subscriptions.map(sub => (
                <span key={sub} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Messages ({messages.length})</h3>
          <button
            onClick={clearMessages}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
          >
            Clear
          </button>
        </div>
        <div className="h-96 overflow-y-auto border rounded p-2 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="mb-2 p-2 bg-white rounded border text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium ${
                    message.type === 'error' ? 'text-red-600' :
                    message.type === 'heartbeat' ? 'text-green-600' :
                    message.type.includes('_update') ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {message.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {message.pair && (
                  <div className="text-xs text-gray-600 mb-1">Pair: {message.pair}</div>
                )}
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
