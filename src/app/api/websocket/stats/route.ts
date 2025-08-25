// WebSocket Statistics API Endpoint
// GET /api/websocket/stats - Get WebSocket server statistics

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { websocketManager } from '@/lib/websocket-server'

/**
 * GET /api/websocket/stats
 * Get WebSocket server statistics and connection information
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "connectedClients": 5,
 *     "activeSubscriptions": 12,
 *     "subscriptionDetails": [
 *       {
 *         "subscription": "EUR-AOA:ticker",
 *         "clientCount": 3
 *       }
 *     ],
 *     "serverStatus": "running",
 *     "timestamp": "2025-08-23T14:30:00.000Z"
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const stats = websocketManager.getStats()
    
    return createSuccessResponse({
      ...stats,
      serverStatus: 'running',
      timestamp: new Date().toISOString()
    }, 'WebSocket server statistics retrieved')

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/websocket/stats'
    })
  }
}
