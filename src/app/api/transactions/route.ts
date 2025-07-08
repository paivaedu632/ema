import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/transactions
 * Get user's transaction history with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const currency = searchParams.get('currency')

    // Validate currency if provided
    if (currency && !['AOA', 'EUR'].includes(currency.toUpperCase())) {
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

    // Build query
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        display_id,
        type,
        amount,
        currency,
        fee_amount,
        net_amount,
        exchange_rate,
        status,
        recipient_info,
        metadata,
        reference_id,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (currency) {
      query = query.eq('currency', currency.toUpperCase())
    }

    // Execute query with count in single request for better performance
    const { data: transactions, error: transactionsError, count } = await query
      .select(`
        id,
        display_id,
        type,
        amount,
        currency,
        fee_amount,
        net_amount,
        exchange_rate,
        status,
        recipient_info,
        metadata,
        reference_id,
        created_at,
        updated_at
      `, { count: 'exact' })

    if (transactionsError) {
      throw new Error(`Failed to fetch transactions: ${transactionsError.message}`)
    }

    // Format response data
    const formattedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      display_id: transaction.display_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency,
      fee_amount: transaction.fee_amount ? parseFloat(transaction.fee_amount.toString()) : null,
      net_amount: transaction.net_amount ? parseFloat(transaction.net_amount.toString()) : null,
      exchange_rate: transaction.exchange_rate ? parseFloat(transaction.exchange_rate.toString()) : null,
      status: transaction.status,
      recipient_info: transaction.recipient_info,
      metadata: transaction.metadata,
      reference_id: transaction.reference_id,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    })) || []

    // Calculate pagination info
    const totalPages = count ? Math.ceil(count / limit) : 1
    const currentPage = Math.floor(offset / limit) + 1

    const response = NextResponse.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        page: currentPage,
        limit,
        offset,
        total: count || 0,
        total_pages: totalPages,
        has_next: currentPage < totalPages,
        has_previous: currentPage > 1
      },
      filters: {
        type,
        status,
        currency
      },
      timestamp: new Date().toISOString()
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    response.headers.set('ETag', `"transactions-${user.id}-${Date.now()}"`)

    return response

  } catch (error) {
    console.error('❌ Error fetching transactions:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
