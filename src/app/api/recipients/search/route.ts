import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * GET /api/recipients/search
 * Search for recipients by email, phone, or name
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

    // Get current user from database
    const { data: currentUser, error: userError } = await getUserByClerkId(clerkUserId)
    
    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters'
      })
    }

    const searchTerm = query.trim().toLowerCase()

    // Search users by email, phone, or name (excluding current user)
    const { data: users, error: searchError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone_number, created_at')
      .neq('id', currentUser.id) // Exclude current user
      .or(`email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .limit(10)

    if (searchError) {
      return NextResponse.json(
        { success: false, error: `Search failed: ${searchError.message}` },
        { status: 500 }
      )
    }

    // Format response data
    const formattedUsers = users?.map(user => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone_number,
      initials: user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : '??',
      created_at: user.created_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      query: searchTerm,
      found_count: formattedUsers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Recipient search error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
