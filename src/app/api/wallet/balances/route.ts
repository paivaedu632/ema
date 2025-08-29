import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse, handleApiError } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/wallet/balances
 * Get user's wallet balances for all currencies (AOA and EUR)
 */
export async function GET(request: NextRequest) {
  try {
    // Use new authentication middleware
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    console.log('💰 Fetching real wallet balances for user:', user.id)

    // Fetch real wallet balances for both currencies from database
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('currency, available_balance, reserved_balance, updated_at')
      .eq('user_id', user.id)
      .in('currency', ['EUR', 'AOA'])

    if (walletsError) {
      throw new Error(`Failed to fetch wallet balances: ${walletsError.message}`)
    }

    // Create response with both currencies, defaulting to zero if wallet doesn't exist
    const currencies = ['EUR', 'AOA'] as const
    const walletBalances = currencies.map(currency => {
      const wallet = wallets?.find(w => w.currency === currency)

      if (wallet) {
        return {
          currency,
          available_balance: parseFloat(wallet.available_balance.toString()),
          reserved_balance: parseFloat(wallet.reserved_balance.toString()),
          last_updated: wallet.updated_at
        }
      } else {
        // Return zero balance if wallet doesn't exist for this currency
        return {
          currency,
          available_balance: 0.00,
          reserved_balance: 0.00,
          last_updated: new Date().toISOString()
        }
      }
    })

    return createSuccessResponse(walletBalances, 'Wallet balances retrieved successfully')

  } catch (error) {
    console.error('❌ Error fetching wallet balances:', error)
    return handleApiError(error)
  }
}
