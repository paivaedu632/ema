import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils'

/**
 * GET /api/test-wallet
 * Simple test endpoint to check wallet API performance
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Return mock data immediately to test performance
    const mockWalletData = [
      {
        currency: 'EUR',
        available_balance: 1250.50,
        reserved_balance: 100.00,
        last_updated: new Date().toISOString()
      },
      {
        currency: 'AOA',
        available_balance: 125000.75,
        reserved_balance: 25000.00,
        last_updated: new Date().toISOString()
      }
    ]

    const endTime = Date.now()
    const responseTime = endTime - startTime

    return createSuccessResponse({
      wallets: mockWalletData,
      performance: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, `Mock wallet data retrieved in ${responseTime}ms`)

  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    console.error('❌ Error in test wallet endpoint:', error)
    return createErrorResponse(`Test failed after ${responseTime}ms: ${error.message}`, 500)
  }
}
