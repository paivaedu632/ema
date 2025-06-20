import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/wallet/balances
 * Get user's wallet balances for all currencies (AOA and EUR)
 */
export async function GET() {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const { data: user, error: userError } = await getUserByClerkId(clerkUserId)

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user wallets with reserved balances using the security function
    const { data: walletBalances, error: walletsError } = await supabaseAdmin
      .rpc('get_user_wallet_balances_secure', {
        requesting_user_id: user.id
      })

    if (walletsError) {
      throw new Error(`Failed to fetch wallet balances: ${walletsError.message}`)
    }

    // Format response data
    const formattedWallets = walletBalances?.map(wallet => ({
      currency: wallet.currency,
      available_balance: parseFloat(wallet.available_balance.toString()),
      reserved_balance: parseFloat(wallet.reserved_balance.toString()),
      last_updated: wallet.updated_at
    })) || []

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

    return NextResponse.json({
      success: true,
      data: completeWallets,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching wallet balances:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet balances',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
