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

    // Get user wallets for all currencies
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('currency, balance, available_balance, pending_balance, updated_at')
      .eq('user_id', user.id)
      .order('currency', { ascending: true })

    if (walletsError) {
      throw new Error(`Failed to fetch wallets: ${walletsError.message}`)
    }

    // Format response data
    const formattedWallets = wallets?.map(wallet => ({
      currency: wallet.currency,
      balance: parseFloat(wallet.balance.toString()),
      available_balance: parseFloat(wallet.available_balance.toString()),
      pending_balance: parseFloat(wallet.pending_balance.toString()),
      last_updated: wallet.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedWallets,
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
