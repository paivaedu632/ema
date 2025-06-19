import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/admin/complete-deposit
 *
 * ⚠️ DEPRECATED ENDPOINT ⚠️
 * This endpoint is DEPRECATED as of the simplified deposit flow implementation.
 * Deposits are now completed automatically upon creation via /api/transactions/deposit.
 *
 * This endpoint remains for backward compatibility but should not be used.
 * It will be removed in a future version.
 *
 * Use /api/transactions/deposit instead for immediate deposit processing.
 */
export async function POST(request: NextRequest) {
  // Return deprecation notice
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED: This endpoint is no longer needed. Deposits are now completed automatically via /api/transactions/deposit.',
      deprecated: true,
      alternative: '/api/transactions/deposit'
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  )

  /* DEPRECATED CODE - Kept for reference
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { transaction_id, admin_notes = 'Completed via admin endpoint' } = body

    // Validate input
    if (!transaction_id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
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

    // Get the transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { success: false, error: 'Deposit transaction not found' },
        { status: 404 }
      )
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Transaction is already ${transaction.status}` },
        { status: 400 }
      )
    }

    const currentTime = new Date().toISOString()

    // Get current wallet balance
    const { data: currentWallet, error: walletFetchError } = await supabaseAdmin
      .from('wallets')
      .select('available_balance')
      .eq('user_id', user.id)
      .eq('currency', transaction.currency)
      .single()

    if (walletFetchError || !currentWallet) {
      console.error('❌ Error fetching wallet:', walletFetchError)
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Update wallet balance
    const newAvailableBalance = currentWallet.available_balance + transaction.amount
    const { error: walletError } = await supabaseAdmin
      .from('wallets')
      .update({
        available_balance: newAvailableBalance,
        updated_at: currentTime
      })
      .eq('user_id', user.id)
      .eq('currency', transaction.currency)

    if (walletError) {
      console.error('❌ Error updating wallet balance:', walletError)
      return NextResponse.json(
        { success: false, error: 'Failed to update wallet balance' },
        { status: 500 }
      )
    }

    // Update transaction status
    const { data: updatedTransaction, error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          admin_notes,
          processed_at: currentTime,
          processing_status: 'payment_confirmed',
          completed_via: 'admin_endpoint'
        },
        updated_at: currentTime
      })
      .eq('id', transaction_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update transaction' },
        { status: 500 }
      )
    }

    // Get updated wallet balance
    const { data: wallet, error: finalWalletError } = await supabaseAdmin
      .from('wallets')
      .select('available_balance, reserved_balance')
      .eq('user_id', user.id)
      .eq('currency', transaction.currency)
      .single()

    return NextResponse.json({
      success: true,
      message: `Deposit of ${transaction.amount} ${transaction.currency} completed successfully`,
      data: {
        transaction: updatedTransaction,
        wallet_balance: wallet ? {
          currency: transaction.currency,
          available_balance: wallet.available_balance,
          reserved_balance: wallet.reserved_balance
        } : null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error completing deposit:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete deposit',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/complete-deposit
 * DEPRECATED - Get pending deposit transactions for the current user
 */
export async function GET() {
  // Return deprecation notice
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED: This endpoint is no longer needed. All deposits are now completed automatically.',
      deprecated: true,
      alternative: '/api/transactions?type=deposit'
    },
    { status: 410 } // 410 Gone
  )

  /* DEPRECATED CODE - Kept for reference
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

    // Get pending deposit transactions
    const { data: transactions, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching transactions:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        pending_deposits: transactions || []
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching pending deposits:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending deposits',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
