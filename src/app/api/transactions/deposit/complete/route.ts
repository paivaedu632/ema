import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/transactions/deposit/complete
 * Complete a pending deposit transaction
 * 
 * This endpoint is triggered when the user clicks "Paguei" (I Paid)
 * after seeing the payment instructions. It uses the atomic function
 * to complete the transaction and update the wallet balance.
 */
export async function POST(request: NextRequest) {
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
    const { transaction_id } = body

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

    // Get the pending transaction
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

    // Use atomic function to complete the deposit
    const { data: result, error: atomicError } = await supabaseAdmin.rpc('complete_pending_deposit', {
      p_transaction_id: transaction_id,
      p_user_id: user.id
    })

    if (atomicError || !result) {
      console.error('❌ Error completing deposit atomically:', atomicError)
      return NextResponse.json(
        { success: false, error: 'Failed to complete deposit transaction' },
        { status: 500 }
      )
    }

    // Parse the result from the atomic function
    const depositResult = typeof result === 'string' ? JSON.parse(result) : result

    // Return success response with transaction and wallet details
    return NextResponse.json({
      success: true,
      message: `Deposit of ${transaction.amount} ${transaction.currency} completed successfully`,
      data: {
        transaction: {
          id: depositResult.transaction.id,
          reference_id: depositResult.transaction.reference_id,
          amount: depositResult.transaction.amount,
          currency: depositResult.transaction.currency,
          status: depositResult.transaction.status,
          created_at: depositResult.transaction.created_at
        },
        wallet: {
          currency: depositResult.wallet.currency,
          available_balance: depositResult.wallet.available_balance,
          updated_at: depositResult.wallet.updated_at
        }
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
