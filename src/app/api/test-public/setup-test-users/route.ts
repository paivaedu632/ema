// Test User Setup API Endpoint
// POST /api/test-public/setup-test-users - Create test users with wallets and balances

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * Test user configurations
 */
const TEST_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'TRADER_1',
    balances: { EUR: 10000, AOA: 5000000 } // 10k EUR, 5M AOA
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'TRADER_2', 
    balances: { EUR: 15000, AOA: 8000000 } // 15k EUR, 8M AOA
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'TRADER_3',
    balances: { EUR: 5000, AOA: 3000000 } // 5k EUR, 3M AOA
  }
]

/**
 * POST /api/test-public/setup-test-users
 * Create test users with wallets and initial balances for trading system testing
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      throw createApiError(
        'Test endpoints not available in production',
        403,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.HIGH
      )
    }

    const results = []

    for (const testUser of TEST_USERS) {
      try {
        // 1. Create or update user record
        const { error: userError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: testUser.id,
            clerk_user_id: `test_${testUser.id}`,
            email: `${testUser.name.toLowerCase()}@test.emapay.com`,
            first_name: testUser.name,
            last_name: 'Test',
            kyc_status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (userError) {
          throw new Error(`Failed to create user ${testUser.name}: ${userError.message}`)
        }

        // 2. Create wallets for each currency
        const walletResults = []
        for (const [currency, balance] of Object.entries(testUser.balances)) {
          const { error: walletError } = await supabaseAdmin
            .from('wallets')
            .upsert({
              user_id: testUser.id,
              currency: currency,
              available_balance: balance,
              reserved_balance: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (walletError) {
            throw new Error(`Failed to create ${currency} wallet for ${testUser.name}: ${walletError.message}`)
          }

          walletResults.push({
            currency,
            available_balance: balance,
            reserved_balance: 0
          })
        }

        results.push({
          user_id: testUser.id,
          name: testUser.name,
          email: `${testUser.name.toLowerCase()}@test.emapay.com`,
          wallets: walletResults,
          status: 'created'
        })

      } catch (error) {
        results.push({
          user_id: testUser.id,
          name: testUser.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Check if all users were created successfully
    const successCount = results.filter(r => r.status === 'created').length
    const errorCount = results.filter(r => r.status === 'error').length

    return createSuccessResponse(
      {
        results,
        summary: {
          total: TEST_USERS.length,
          successful: successCount,
          errors: errorCount,
          ready_for_trading: successCount === TEST_USERS.length
        },
        next_steps: successCount > 0 ? [
          'Use POST /api/test-public/orders/place to create test orders',
          'Check GET /api/test-public/orders/status for current market state',
          'Available test users: ' + results.filter(r => r.status === 'created').map(r => r.name).join(', ')
        ] : [
          'Fix errors above before proceeding with trading tests'
        ]
      },
      `Test users setup completed: ${successCount}/${TEST_USERS.length} successful`
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'POST /api/test-public/setup-test-users'
    })
  }
}

/**
 * GET /api/test-public/setup-test-users
 * Check current test user setup status
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return createSuccessResponse(
        { message: 'Test endpoints not available in production' },
        'Production mode'
      )
    }

    const results = []

    for (const testUser of TEST_USERS) {
      try {
        // Check if user exists
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, email, first_name, last_name, kyc_status')
          .eq('id', testUser.id)
          .single()

        if (userError || !user) {
          results.push({
            user_id: testUser.id,
            name: testUser.name,
            status: 'not_found',
            user: null,
            wallets: []
          })
          continue
        }

        // Check wallets
        const { data: wallets, error: walletsError } = await supabaseAdmin
          .from('wallets')
          .select('currency, available_balance, reserved_balance')
          .eq('user_id', testUser.id)

        if (walletsError) {
          throw new Error(`Failed to fetch wallets: ${walletsError.message}`)
        }

        results.push({
          user_id: testUser.id,
          name: testUser.name,
          status: 'exists',
          user: {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            kyc_status: user.kyc_status
          },
          wallets: wallets || []
        })

      } catch (error) {
        results.push({
          user_id: testUser.id,
          name: testUser.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const existingCount = results.filter(r => r.status === 'exists').length
    const readyForTrading = existingCount === TEST_USERS.length && 
      results.every(r => r.wallets && r.wallets.length >= 2)

    return createSuccessResponse(
      {
        results,
        summary: {
          total: TEST_USERS.length,
          existing: existingCount,
          ready_for_trading: readyForTrading
        },
        actions: readyForTrading ? [
          'All test users are ready for trading',
          'Use POST /api/test-public/orders/place to create orders'
        ] : [
          'Run POST /api/test-public/setup-test-users to create missing users/wallets'
        ]
      },
      'Test user status retrieved'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/test-public/setup-test-users'
    })
  }
}
