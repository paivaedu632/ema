import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/test-deposit
 * 
 * ⚠️ TEMPORARY TESTING ENDPOINT ⚠️
 * This endpoint is for testing purposes only and simulates deposit functionality.
 * It will be replaced with actual payment gateway integration in production.
 * 
 * Adds money to user wallets for testing buy/sell/send functionality.
 * 
 * @param amount - The amount to deposit (positive number)
 * @param currency - The currency ('AOA' or 'EUR')
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
    const { amount, currency } = body

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

    // Check if wallet exists for this currency
    const { data: existingWallet, error: walletCheckError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, available_balance')
      .eq('user_id', user.id)
      .eq('currency', normalizedCurrency)
      .single()

    if (walletCheckError && walletCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking wallet:', walletCheckError)
      return NextResponse.json(
        { success: false, error: 'Database error while checking wallet' },
        { status: 500 }
      )
    }

    let updatedWallet
    const currentTime = new Date().toISOString()

    if (existingWallet) {
      // Update existing wallet
      const newBalance = parseFloat(existingWallet.balance.toString()) + depositAmount
      const newAvailableBalance = parseFloat(existingWallet.available_balance.toString()) + depositAmount

      const { data: walletData, error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({
          balance: newBalance,
          available_balance: newAvailableBalance,
          updated_at: currentTime
        })
        .eq('user_id', user.id)
        .eq('currency', normalizedCurrency)
        .select('currency, balance, available_balance, updated_at')
        .single()

      if (updateError) {
        console.error('❌ Error updating wallet:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update wallet balance' },
          { status: 500 }
        )
      }

      updatedWallet = walletData
    } else {
      // Create new wallet
      const { data: walletData, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: user.id,
          currency: normalizedCurrency,
          balance: depositAmount,
          available_balance: depositAmount,
          pending_balance: 0.00,
          created_at: currentTime,
          updated_at: currentTime
        })
        .select('currency, balance, available_balance, updated_at')
        .single()

      if (createError) {
        console.error('❌ Error creating wallet:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      updatedWallet = walletData
    }

    // Create a transaction record for audit trail
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        currency: normalizedCurrency,
        status: 'completed',
        description: `Test deposit - ${depositAmount} ${normalizedCurrency}`,
        metadata: {
          test_deposit: true,
          description: 'Simulated deposit for testing purposes',
          processing_time: '0ms'
        },
        created_at: currentTime
      })

    if (transactionError) {
      console.error('❌ Error creating transaction record:', transactionError)
      // Don't fail the request since wallet was updated successfully
    }

    // Format response data
    const formattedWallet = {
      currency: updatedWallet.currency,
      balance: parseFloat(updatedWallet.balance.toString()),
      available_balance: parseFloat(updatedWallet.available_balance.toString()),
      last_updated: updatedWallet.updated_at
    }

    return NextResponse.json({
      success: true,
      message: `Depósito de teste processado com sucesso`,
      data: {
        wallet: formattedWallet,
        deposit: {
          amount: depositAmount,
          currency: normalizedCurrency,
          timestamp: currentTime
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error processing test deposit:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
