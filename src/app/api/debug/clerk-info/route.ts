// Debug endpoint to get Clerk user information
// GET /api/debug/clerk-info - Get current user's Clerk information

import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    // Get auth information
    const { userId, sessionId } = await auth()
    
    // Get current user details
    const user = await currentUser()
    
    return Response.json({
      success: true,
      data: {
        clerk_user_id: userId,
        session_id: sessionId,
        email: user?.emailAddresses?.[0]?.emailAddress,
        user_details: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          createdAt: user?.createdAt,
          updatedAt: user?.updatedAt
        }
      }
    })
  } catch (error) {
    console.error('Error getting Clerk info:', error)
    
    return Response.json({
      success: false,
      error: 'Failed to get Clerk information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
