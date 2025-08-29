import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse, handleApiError } from '@/lib/api-utils'
import { OrderBookFunctions } from '@/lib/supabase-server'

/**
 * GET /api/wallet/balances
 * Get user's wallet balances for all currencies (AOA and EUR)
 */
export async function GET(request: NextRequest) {
  try {
    // Use new authentication middleware
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // TEMPORARY FIX: Return mock data since database function doesn't exist
    // TODO: Implement proper database function or use existing get_wallet_balance
    console.log('🔧 Using mock wallet data for user:', user.id)

    const mockWalletBalances = [
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

    return createSuccessResponse(mockWalletBalances, 'Wallet balances retrieved successfully (mock data)')

  } catch (error) {
    console.error('❌ Error fetching wallet balances:', error)
    return handleApiError(error)
  }
}
