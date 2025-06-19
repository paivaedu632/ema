import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/transactions/deposit/instructions
 * Generate payment instructions for a deposit
 * 
 * This endpoint creates a pending deposit transaction and returns
 * payment instructions for the user to complete the bank transfer.
 * The deposit is completed when the user clicks "Paguei" (I Paid).
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
    const userReference = clerkUserId.slice(-8) // Use last 8 chars of clerk ID as reference
    const currentTime = new Date().toISOString()

    // Create a pending deposit transaction (not completed yet)
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        currency: normalizedCurrency,
        status: 'pending',
        fee_amount: 0.00, // No fees for deposits
        net_amount: depositAmount,
        reference_id: referenceId,
        metadata: {
          payment_method,
          description: `Deposit - ${depositAmount} ${normalizedCurrency}`,
          deposit_instructions: {
            payee_name: 'EMA AGOSTINHO',
            phone_number: '244923300064',
            iban: '12345',
            reference: userReference
          },
          processing_status: 'awaiting_payment',
          created_via: 'web_app',
          user_reference: userReference
        },
        created_at: currentTime
      })
      .select()
      .single()

    if (transactionError) {
      console.error('❌ Error creating pending deposit transaction:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create deposit transaction' },
        { status: 500 }
      )
    }

    // Return payment instructions
    return NextResponse.json({
      success: true,
      message: 'Payment instructions generated successfully',
      data: {
        payee_name: 'EMA AGOSTINHO',
        phone_number: '244923300064',
        iban: '12345',
        reference: userReference,
        amount: depositAmount,
        currency: normalizedCurrency,
        transaction_id: transaction.id
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error generating payment instructions:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate payment instructions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
