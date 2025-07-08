import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/transactions/[id]
 * Get a specific transaction by ID (display_id or UUID)
 * Only returns transactions that belong to the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get user from database
    const { data: user, error: userError } = await getUserByClerkId(clerkUserId)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const { id } = params
    
    // Determine if ID is display_id (starts with EP-) or UUID
    const isDisplayId = id.startsWith('EP-')
    
    // Build query to fetch transaction with related data
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        display_id,
        user_id,
        type,
        amount,
        currency,
        fee_amount,
        net_amount,
        exchange_rate,
        status,
        reference_id,
        recipient_info,
        metadata,
        created_at,
        updated_at,
        linked_transaction_id,
        exchange_id,
        counterparty_user_id
      `)
      .eq('user_id', user.id) // Only allow access to user's own transactions

    // Filter by display_id or UUID
    if (isDisplayId) {
      query = query.eq('display_id', id)
    } else {
      query = query.eq('id', id)
    }

    const { data: transaction, error: transactionError } = await query.single()

    if (transactionError) {
      if (transactionError.code === 'PGRST116') {
        // No rows returned - transaction not found or doesn't belong to user
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        )
      }
      throw new Error(`Failed to fetch transaction: ${transactionError.message}`)
    }

    // Fetch linked transaction if exists
    let linkedTransaction = null
    if (transaction.linked_transaction_id) {
      const { data: linked } = await supabaseAdmin
        .from('transactions')
        .select(`
          id,
          display_id,
          user_id,
          type,
          amount,
          currency,
          fee_amount,
          net_amount,
          exchange_rate,
          status,
          metadata,
          created_at
        `)
        .eq('id', transaction.linked_transaction_id)
        .single()
      
      linkedTransaction = linked
    }

    // Fetch counterparty user if exists
    let counterpartyUser = null
    if (transaction.counterparty_user_id) {
      const { data: counterparty } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .eq('id', transaction.counterparty_user_id)
        .single()
      
      counterpartyUser = counterparty
    }

    // Format response
    const enhancedTransaction = {
      ...transaction,
      linked_transaction: linkedTransaction,
      counterparty_user: counterpartyUser
    }

    const response = NextResponse.json({
      success: true,
      data: enhancedTransaction,
      timestamp: new Date().toISOString()
    })

    // Add caching headers
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    response.headers.set('ETag', `"transaction-${transaction.id}-${transaction.updated_at}"`)

    return response

  } catch (error) {
    console.error('Error in GET /api/transactions/[id]:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
