import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/wallet/balance/[currency]
 * Get balance for specific currency (AOA or EUR)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { currency: string } }
) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate currency parameter
    const currency = params.currency.toUpperCase()
    if (!['AOA', 'EUR'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be AOA or EUR' },
        { status: 400 }
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

    // Get wallet balance for specific currency
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('currency, balance, available_balance, pending_balance, updated_at')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single()

    if (walletError) {
      // If wallet doesn't exist, return zero balance
      if (walletError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: {
            currency,
            balance: 0.00,
            available_balance: 0.00,
            pending_balance: 0.00,
            last_updated: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        })
      }
      
      throw new Error(`Failed to fetch wallet balance: ${walletError.message}`)
    }

    // Format response data
    const formattedWallet = {
      currency: wallet.currency,
      balance: parseFloat(wallet.balance.toString()),
      available_balance: parseFloat(wallet.available_balance.toString()),
      pending_balance: parseFloat(wallet.pending_balance.toString()),
      last_updated: wallet.updated_at
    }

    return NextResponse.json({
      success: true,
      data: formattedWallet,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`❌ Error fetching ${params.currency} wallet balance:`, error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet balance',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
