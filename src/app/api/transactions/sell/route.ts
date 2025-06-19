import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/transactions/sell
 * Process a sell transaction (AOA -> EUR)
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
    const { amount, exchangeRate } = body

    // Validate input
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    if (exchangeRate && (isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Invalid exchange rate. Must be a positive number.' },
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

    // Call the RPC function to process the sell transaction
    const { data: result, error: transactionError } = await supabaseAdmin
      .rpc('process_sell_transaction', {
        user_uuid: user.id,
        amount_aoa: Number(amount),
        exchange_rate_value: exchangeRate ? Number(exchangeRate) : null
      })

    if (transactionError) {
      console.error('❌ Sell transaction failed:', transactionError)
      
      // Handle specific error cases
      if (transactionError.message.includes('Insufficient AOA balance')) {
        return NextResponse.json(
          { success: false, error: 'Saldo AOA insuficiente para esta transação.' },
          { status: 400 }
        )
      }
      
      if (transactionError.message.includes('Exchange rate not available')) {
        return NextResponse.json(
          { success: false, error: 'Taxa de câmbio não disponível. Tente novamente.' },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Falha ao processar transação de venda.',
          details: transactionError.message 
        },
        { status: 500 }
      )
    }

    // Format response
    const formattedResult = {
      transactionId: result.transaction_id,
      status: result.status,
      amountAoa: parseFloat(result.amount_aoa),
      eurAmount: parseFloat(result.eur_amount),
      netAmount: parseFloat(result.net_amount),
      feeAmount: parseFloat(result.fee_amount),
      exchangeRate: parseFloat(result.exchange_rate),
      timestamp: result.timestamp
    }

    return NextResponse.json({
      success: true,
      message: 'Transação de venda processada com sucesso',
      data: formattedResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error processing sell transaction:', error)
    
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
