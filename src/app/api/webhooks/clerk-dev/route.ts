import { NextRequest, NextResponse } from 'next/server'
import { createUser, createUserWallets } from '@/lib/supabase-server'

/**
 * Development-only webhook endpoint that bypasses signature verification
 * This is used for testing when webhook secrets are not properly configured
 * 
 * WARNING: This endpoint should NEVER be used in production!
 */

// Only allow in development
if (process.env.NODE_ENV === 'production') {
  throw new Error('Development webhook endpoint cannot be used in production!')
}

// Clerk webhook event types
type ClerkWebhookEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      id: string
    }>
    first_name?: string
    last_name?: string
    phone_numbers?: Array<{
      phone_number: string
      id: string
    }>
    image_url?: string
    created_at: number
    updated_at: number
  }
}

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Development endpoint not available in production' },
      { status: 403 }
    )
  }

  console.log('🧪 Development webhook endpoint called (bypassing signature verification)')

  try {
    // Get the body without signature verification
    const payload = await req.text()
    const body = JSON.parse(payload)

    // Handle the webhook event
    switch (body.type) {
      case 'user.created':
        await handleUserCreated(body.data)
        break
      case 'user.updated':
        await handleUserUpdated(body.data)
        break
      case 'user.deleted':
        await handleUserDeleted(body.data)
        break
      default:
        console.log(`Unhandled webhook event type: ${body.type}`)
    }

    return NextResponse.json({
      success: true,
      message: `Development webhook ${body.type} processed successfully`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error processing development webhook:`, error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to process development webhook`,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Handle user creation webhook
 */
async function handleUserCreated(userData: ClerkWebhookEvent['data']) {
  console.log('🔄 Processing user.created webhook for:', userData.email_addresses[0]?.email_address)

  try {
    // Extract user data
    const email = userData.email_addresses[0]?.email_address
    const phone = userData.phone_numbers?.[0]?.phone_number
    const fullName = userData.first_name && userData.last_name 
      ? `${userData.first_name} ${userData.last_name}`.trim()
      : userData.first_name || userData.last_name || null

    if (!email) {
      throw new Error('User email is required')
    }

    // Create user in Supabase
    const { data: user, error: userError } = await createUser({
      clerk_user_id: userData.id,
      email: email,
      full_name: fullName,
      phone_number: phone,
      profile_image_url: userData.image_url
    })

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    if (!user) {
      throw new Error('User creation returned no data')
    }

    console.log('✅ User created in Supabase:', user.id)

    // Create AOA and EUR wallets for the new user
    const { data: wallets, error: walletsError } = await createUserWallets(user.id)

    if (walletsError) {
      throw new Error(`Failed to create wallets: ${walletsError.message}`)
    }

    console.log('✅ Wallets created for user:', wallets?.length || 0, 'wallets')

    return { user, wallets }
  } catch (error) {
    console.error('❌ Error in handleUserCreated:', error)
    throw error
  }
}

/**
 * Handle user update webhook
 */
async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  console.log('🔄 Processing user.updated webhook for:', userData.email_addresses[0]?.email_address)

  try {
    // For now, we'll just log the update
    // In the future, we could update user profile data in Supabase
    console.log('ℹ️ User update webhook received but not processed (feature not implemented)')
    
    return { message: 'User update logged' }
  } catch (error) {
    console.error('❌ Error in handleUserUpdated:', error)
    throw error
  }
}

/**
 * Handle user deletion webhook
 */
async function handleUserDeleted(userData: ClerkWebhookEvent['data']) {
  console.log('🔄 Processing user.deleted webhook for user ID:', userData.id)

  try {
    // For now, we'll just log the deletion
    // In the future, we could implement soft deletion or data cleanup
    console.log('ℹ️ User deletion webhook received but not processed (feature not implemented)')
    
    return { message: 'User deletion logged' }
  } catch (error) {
    console.error('❌ Error in handleUserDeleted:', error)
    throw error
  }
}

/**
 * GET endpoint to check development webhook status
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Development endpoint not available in production' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Development webhook endpoint is active',
    warning: 'This endpoint bypasses signature verification and should NEVER be used in production',
    environment: process.env.NODE_ENV,
    webhook_url: '/api/webhooks/clerk-dev',
    timestamp: new Date().toISOString()
  })
}
