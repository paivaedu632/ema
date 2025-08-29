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

    // Use new database functions layer
    const walletBalances = await OrderBookFunctions.getUserWalletBalances(user.id)

    // Format response data
    const formattedWallets = walletBalances.map(wallet => ({
      currency: wallet.currency,
      available_balance: wallet.available_balance,
      reserved_balance: wallet.reserved_balance,
      last_updated: wallet.updated_at
    }))

    // Ensure we have both currencies (AOA and EUR) even if user has no balance
    const currencies = ['AOA', 'EUR']
    const completeWallets = currencies.map(currency => {
      const existingWallet = formattedWallets.find(w => w.currency === currency)
      return existingWallet || {
        currency,
        available_balance: 0.00,
        reserved_balance: 0.00,
        last_updated: new Date().toISOString()
      }
    })

    return createSuccessResponse(completeWallets, 'Wallet balances retrieved successfully')

  } catch (error) {
    console.error('❌ Error fetching wallet balances:', error)
    return handleApiError(error)
  }
}
