import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/transactions/deposit
 * DEPRECATED - Use /api/transactions/deposit/instructions instead
 *
 * This endpoint is deprecated in favor of the corrected 2-step flow:
 * 1. POST /api/transactions/deposit/instructions - Generate payment instructions
 * 2. POST /api/transactions/deposit/complete - Complete after user confirmation
 *
 * This maintains the realistic user flow while using atomic completion.
 */
export async function POST(request: NextRequest) {
  // Return deprecation notice
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED: Use /api/transactions/deposit/instructions to generate payment instructions, then /api/transactions/deposit/complete to finish the deposit.',
      deprecated: true,
      alternatives: {
        instructions: '/api/transactions/deposit/instructions',
        completion: '/api/transactions/deposit/complete'
      }
    },
    { status: 410 } // 410 Gone
  )

  /* DEPRECATED CODE - Use new 2-step flow instead
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
    const { amount, currency, payment_method = 'bank_transfer' } = body

    // Validate input - amount
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    // Validate input - currency
    if (!currency || !['AOA', 'EUR'].includes(currency.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be AOA or EUR.' },
        { status: 400 }
      )
    }

    const normalizedCurrency = currency.toUpperCase()
    const depositAmount = Number(amount)

    // Get user from database
    const { data: user, error: userError } = await getUserByClerkId(clerkUserId)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate a unique reference ID for the deposit
    const referenceId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const currentTime = new Date().toISOString()

    // Perform atomic transaction: Create completed deposit + Update wallet balance
    const { data: result, error: transactionError } = await supabaseAdmin.rpc('process_deposit_atomic', {
      p_user_id: user.id,
      p_amount: depositAmount,
      p_currency: normalizedCurrency,
      p_reference_id: referenceId,
      p_payment_method: payment_method,
      p_user_reference: clerkUserId.slice(-8)
    })

    if (transactionError || !result) {
      console.error('❌ Error processing deposit:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to process deposit transaction' },
        { status: 500 }
      )
    }

    // Parse the result from the atomic function
    const depositResult = typeof result === 'string' ? JSON.parse(result) : result

    // Return success response with transaction and wallet details
    return NextResponse.json({
      success: true,
      message: `Deposit of ${depositAmount} ${normalizedCurrency} completed successfully`,
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
    console.error('❌ Error processing deposit:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process deposit',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// PATCH method removed - deposits are now completed immediately upon creation
// No manual completion step required
