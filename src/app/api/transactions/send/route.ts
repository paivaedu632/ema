import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/transactions/send
 * Process a send transaction
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
    const { amount, currency, recipient } = body

    // Validate input
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    if (!currency || !['AOA', 'EUR'].includes(currency.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be AOA or EUR.' },
        { status: 400 }
      )
    }

    if (!recipient || !recipient.name || !recipient.email) {
      return NextResponse.json(
        { success: false, error: 'Recipient information is required (name and email).' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipient.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipient email format.' },
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

    // Prepare recipient info
    const recipientInfo = {
      name: recipient.name.trim(),
      email: recipient.email.toLowerCase().trim(),
      phone: recipient.phone || null,
      notes: recipient.notes || null
    }

    // Call the RPC function to process the send transaction
    const { data: result, error: transactionError } = await supabaseAdmin
      .rpc('process_send_transaction', {
        sender_uuid: user.id,
        recipient_info: recipientInfo,
        amount_value: Number(amount),
        currency_code: currency.toUpperCase()
      })

    if (transactionError) {
      console.error('❌ Send transaction failed:', transactionError)
      
      // Handle specific error cases
      if (transactionError.message.includes('Insufficient')) {
        return NextResponse.json(
          { success: false, error: `Saldo ${currency.toUpperCase()} insuficiente para esta transação.` },
          { status: 400 }
        )
      }
      
      if (transactionError.message.includes('Wallet not found')) {
        return NextResponse.json(
          { success: false, error: `Carteira ${currency.toUpperCase()} não encontrada.` },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Falha ao processar transação de envio.',
          details: transactionError.message 
        },
        { status: 500 }
      )
    }

    // Format response
    const formattedResult = {
      transactionId: result.transaction_id,
      status: result.status,
      amount: parseFloat(result.amount),
      currency: result.currency,
      netAmount: parseFloat(result.net_amount),
      feeAmount: parseFloat(result.fee_amount),
      recipient: result.recipient,
      timestamp: result.timestamp
    }

    return NextResponse.json({
      success: true,
      message: 'Transação de envio processada com sucesso',
      data: formattedResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error processing send transaction:', error)
    
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
