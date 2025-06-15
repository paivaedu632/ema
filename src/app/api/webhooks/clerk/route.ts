import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { createUser, createUserWallets } from '@/lib/supabase-server'

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
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable')
    return NextResponse.json(
      { success: false, error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers')
    return NextResponse.json(
      { success: false, error: 'Missing webhook headers' },
      { status: 400 }
    )
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: ClerkWebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json(
      { success: false, error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  // Handle the webhook event
  try {
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data)
        break
      case 'user.updated':
        await handleUserUpdated(evt.data)
        break
      case 'user.deleted':
        await handleUserDeleted(evt.data)
        break
      default:
        console.log(`Unhandled webhook event type: ${evt.type}`)
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${evt.type} processed successfully`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error processing webhook ${evt.type}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to process ${evt.type} webhook`,
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
