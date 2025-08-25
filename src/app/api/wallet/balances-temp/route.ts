// Temporary wallet balances API with Supabase Auth for testing
// TEMPORARY: Using Supabase Auth instead of Clerk for easier development
// TODO: Switch back to Clerk when ready

import { NextRequest, NextResponse } from 'next/server'
// CLERK IMPORTS (commented out for temporary Supabase Auth)
// import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/wallet/balances-temp
 * Temporary endpoint with Supabase authentication for testing
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing wallet balances with Supabase auth...')

    let userId: string | null = null
    let authMethod = 'none'

    // Try Supabase authentication
    let authUserId: string | null = null
    let userEmail: string | null = null

    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.log('⚠️ Supabase auth error:', error.message)
        authMethod = 'supabase-error'
      } else if (user) {
        authUserId = user.id
        userEmail = user.email
        authMethod = 'supabase'
        console.log('✅ Supabase auth successful:', { authUserId, authMethod, email: userEmail })

        // Now map the Supabase Auth user to our database user using email
        if (userEmail) {
          console.log('🔍 Looking up database user by email:', userEmail)

          const { data: dbUsers, error: dbError } = await supabaseAdmin
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('email', userEmail)
            .limit(1)

          if (dbError) {
            console.log('❌ Database user lookup error:', dbError.message)
          } else if (dbUsers && dbUsers.length > 0) {
            userId = dbUsers[0].id
            console.log('✅ Found database user:', {
              authUserId,
              databaseUserId: userId,
              email: userEmail,
              name: `${dbUsers[0].first_name || ''} ${dbUsers[0].last_name || ''}`.trim()
            })
          } else {
            console.log('⚠️ No database user found for email:', userEmail)
          }
        }
      } else {
        console.log('⚠️ Supabase auth returned null user')
        authMethod = 'supabase-null-user'
      }
    } catch (supabaseError) {
      console.log('⚠️ Supabase auth threw error:', supabaseError instanceof Error ? supabaseError.message : 'Unknown error')
      authMethod = 'supabase-exception'
    }

    // Fallback for testing when no authentication is available
    if (!userId) {
      console.log('🔄 No authenticated user found, using fallback for testing')
      userId = '519e2350-ea9b-411e-b5b3-1cb15107277b'
      authMethod = 'fallback-testing'
      console.log('🔄 Using fallback user ID for testing:', { userId, authMethod })
    }
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'No user ID available',
        debug: { authMethod }
      }, { status: 401 })
    }
    
    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({
        success: false,
        error: 'User not found in database',
        debug: { userId, userError: userError?.message }
      }, { status: 404 })
    }
    
    console.log('✅ User found:', user)
    
    // Get wallet balances
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('currency, available_balance, reserved_balance, updated_at')
      .eq('user_id', userId)
    
    if (walletsError) {
      console.error('❌ Error fetching wallets:', walletsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch wallet balances',
        debug: { walletsError: walletsError.message }
      }, { status: 500 })
    }
    
    console.log('✅ Wallets found:', wallets)
    
    // Format response data
    const formattedWallets = (wallets || []).map(wallet => ({
      currency: wallet.currency,
      available_balance: wallet.available_balance,
      reserved_balance: wallet.reserved_balance,
      last_updated: wallet.updated_at
    }))
    
    // Ensure we have both currencies (AOA and EUR) even if user has no balance
    const currencies = ['AOA', 'EUR']
    const completeWallets = currencies.map(currency => {
      const existingWallet = formattedWallets.find(w => w.currency === currency)
      return existingWallet || {
        currency,
        available_balance: 0.00,
        reserved_balance: 0.00,
        last_updated: new Date().toISOString()
      }
    })
    
    return NextResponse.json({
      success: true,
      data: completeWallets,
      debug: {
        authMethod,
        userId,
        userEmail: user.email,
        walletsCount: wallets?.length || 0
      }
    })
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}
