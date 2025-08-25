// Debug endpoint to test authentication status
// GET /api/debug/auth-test - Test authentication and return detailed info

import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Auth Test - Starting diagnostic...')
    
    // Get current time for JWT timing analysis
    const now = new Date()
    const systemTime = now.toISOString()
    const utcTime = now.toUTCString()
    const timestamp = now.getTime()
    
    console.log('⏰ System Time:', systemTime)
    console.log('⏰ UTC Time:', utcTime)
    
    // Test auth() function
    let authResult
    try {
      const authData = await auth()
      authResult = {
        success: true,
        userId: authData.userId,
        sessionId: authData.sessionId,
        orgId: authData.orgId,
        hasUserId: !!authData.userId,
        hasSessionId: !!authData.sessionId
      }
      console.log('✅ Auth data retrieved:', authResult)
    } catch (authError) {
      authResult = {
        success: false,
        error: authError instanceof Error ? authError.message : 'Unknown auth error',
        stack: authError instanceof Error ? authError.stack : undefined
      }
      console.error('❌ Auth error:', authResult)
    }
    
    // Test currentUser() function
    let userResult
    try {
      const user = await currentUser()
      userResult = {
        success: true,
        hasUser: !!user,
        userId: user?.id,
        email: user?.emailAddresses?.[0]?.emailAddress,
        firstName: user?.firstName,
        lastName: user?.lastName,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt
      }
      console.log('✅ User data retrieved:', userResult)
    } catch (userError) {
      userResult = {
        success: false,
        error: userError instanceof Error ? userError.message : 'Unknown user error',
        stack: userError instanceof Error ? userError.stack : undefined
      }
      console.error('❌ User error:', userResult)
    }
    
    // Environment check
    const envCheck = {
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 15) + '...',
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 15) + '...',
      nodeEnv: process.env.NODE_ENV
    }
    
    // Headers analysis
    const headers = {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    }
    
    const result = {
      success: true,
      timestamp: {
        systemTime,
        utcTime,
        unixTimestamp: timestamp
      },
      auth: authResult,
      user: userResult,
      environment: envCheck,
      headers,
      recommendations: []
    }
    
    // Add recommendations based on results
    if (!authResult.success) {
      result.recommendations.push('❌ Authentication failed - check Clerk configuration')
    }
    
    if (!userResult.success) {
      result.recommendations.push('❌ User data unavailable - user may not be signed in')
    }
    
    if (!authResult.hasUserId && !userResult.hasUser) {
      result.recommendations.push('⚠️ No user session detected - please sign in')
    }
    
    if (authResult.success && userResult.success && authResult.hasUserId) {
      result.recommendations.push('✅ Authentication working correctly!')
    }
    
    console.log('🎯 Final diagnostic result:', result)
    
    return Response.json(result)
    
  } catch (error) {
    console.error('💥 Diagnostic endpoint error:', error)
    
    return Response.json({
      success: false,
      error: 'Diagnostic endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
