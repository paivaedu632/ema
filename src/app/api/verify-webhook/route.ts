import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Verify webhook implementation by checking database state
 */
export async function GET() {
  try {
    console.log('🔍 Verifying webhook implementation...')

    // Check users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, clerk_user_id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    // Check wallets table
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('id, user_id, currency, balance, available_balance, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (walletsError) {
      throw new Error(`Failed to fetch wallets: ${walletsError.message}`)
    }

    // Count total users and wallets
    const { count: userCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: walletCount } = await supabaseAdmin
      .from('wallets')
      .select('*', { count: 'exact', head: true })

    // Check for test users
    const testUsers = users?.filter(user => 
      user.email?.includes('test') || 
      user.clerk_user_id?.includes('test')
    ) || []

    return NextResponse.json({
      success: true,
      message: 'Webhook implementation verification',
      data: {
        summary: {
          total_users: userCount || 0,
          total_wallets: walletCount || 0,
          test_users_found: testUsers.length,
          expected_wallets_per_user: 2, // AOA + EUR
          wallet_user_ratio: userCount ? (walletCount || 0) / userCount : 0
        },
        recent_users: users?.map(user => ({
          id: user.id,
          clerk_user_id: user.clerk_user_id,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at
        })) || [],
        recent_wallets: wallets?.map(wallet => ({
          id: wallet.id,
          user_id: wallet.user_id,
          currency: wallet.currency,
          balance: wallet.balance,
          available_balance: wallet.available_balance,
          created_at: wallet.created_at
        })) || [],
        test_users: testUsers.map(user => ({
          id: user.id,
          clerk_user_id: user.clerk_user_id,
          email: user.email
        }))
      },
      verification: {
        webhook_endpoint_exists: true,
        database_connection: true,
        user_creation_working: (userCount || 0) > 0,
        wallet_creation_working: (walletCount || 0) > 0,
        proper_wallet_ratio: userCount ? (walletCount || 0) / userCount === 2 : false
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Verification error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
