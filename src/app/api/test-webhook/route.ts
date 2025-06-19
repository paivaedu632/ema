import { NextRequest, NextResponse } from 'next/server'
import { createUser, supabaseAdmin } from '@/lib/supabase-server'

/**
 * Test endpoint to verify webhook functionality without Clerk
 * This simulates a user.created webhook event
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing webhook functionality...')

    // Mock user data (similar to what Clerk would send)
    const timestamp = Date.now()
    const mockUserData = {
      id: `test_user_${timestamp}`,
      email_addresses: [
        {
          email_address: `test_${timestamp}@emapay.com`,
          id: 'email_123'
        }
      ],
      first_name: 'Test',
      last_name: 'User',
      phone_numbers: [
        {
          phone_number: '+244900000000',
          id: 'phone_123'
        }
      ],
      image_url: 'https://example.com/avatar.jpg',
      created_at: Date.now(),
      updated_at: Date.now()
    }

    // Extract user data
    const email = mockUserData.email_addresses[0]?.email_address
    const phone = mockUserData.phone_numbers?.[0]?.phone_number
    const fullName = mockUserData.first_name && mockUserData.last_name 
      ? `${mockUserData.first_name} ${mockUserData.last_name}`.trim()
      : mockUserData.first_name || mockUserData.last_name || null

    if (!email) {
      throw new Error('User email is required')
    }

    console.log('📧 Creating user with email:', email)

    // Create user in Supabase
    const { data: user, error: userError } = await createUser({
      clerk_user_id: mockUserData.id,
      email: email,
      full_name: fullName,
      phone_number: phone,
      profile_image_url: mockUserData.image_url
    })

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    if (!user) {
      throw new Error('User creation returned no data')
    }

    console.log('✅ User created in Supabase:', user.id)

    // Wallets are automatically created by database trigger
    // Fetch the created wallets to return in response
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)

    if (walletsError) {
      console.warn('⚠️ Could not fetch wallets:', walletsError.message)
    }

    console.log('✅ Wallets found for user:', wallets?.length || 0, 'wallets')

    return NextResponse.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: {
        user: {
          id: user.id,
          clerk_user_id: user.clerk_user_id,
          email: user.email,
          full_name: user.full_name
        },
        wallets: wallets?.map(wallet => ({
          id: wallet.id,
          currency: wallet.currency,
          balance: wallet.balance,
          available_balance: wallet.available_balance
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Test webhook error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check webhook configuration
 */
export async function GET() {
  try {
    const hasWebhookSecret = !!process.env.CLERK_WEBHOOK_SECRET
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration check',
      configuration: {
        webhook_secret_configured: hasWebhookSecret,
        supabase_configured: hasSupabaseConfig,
        webhook_endpoint: '/api/webhooks/clerk',
        test_endpoint: '/api/test-webhook'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
