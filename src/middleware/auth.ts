// EmaPay API Authentication Middleware
// Integrates with Clerk JWT authentication for API routes

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/supabase-server'
import { 
  AuthContext, 
  AuthResult, 
  AuthError, 
  AuthErrorType,
  AuthMiddlewareOptions,
  AuthPermissions
} from '@/types/auth'

/**
 * Authenticate API request using Clerk JWT
 * Extracts user ID from Clerk session and validates against database
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthResult> {
  const { required = true, requireKYC = false, requireAdmin = false } = options

  try {
    // Get Clerk authentication context with error handling
    let clerkUserId: string | null = null

    try {
      const authResult = await auth()
      clerkUserId = authResult.userId

      // Debug logging for authentication issues
      console.log('🔍 Auth Debug:', {
        userId: clerkUserId,
        sessionId: authResult.sessionId,
        hasUserId: !!clerkUserId,
        timestamp: new Date().toISOString()
      })

    } catch (authError) {
      console.error('❌ Clerk auth() function error:', authError)

      // If authentication is required, this is a hard failure
      if (required) {
        throw new AuthError(
          AuthErrorType.UNAUTHORIZED,
          'Clerk authentication failed',
          401
        )
      }
    }

    // If authentication is not required and no user, return success
    if (!required && !clerkUserId) {
      return {
        success: true,
        context: undefined
      }
    }

    // If authentication is required but no user, return error
    if (required && !clerkUserId) {
      throw new AuthError(
        AuthErrorType.MISSING_TOKEN,
        'Authentication required - no valid session found',
        401
      )
    }

    // If we have a user ID, validate against database
    if (clerkUserId) {
      const { data: user, error: userError } = await getUserByClerkId(clerkUserId)

      if (userError || !user) {
        throw new AuthError(
          AuthErrorType.USER_NOT_FOUND,
          'User not found in database',
          404
        )
      }

      // Check KYC requirement
      if (requireKYC && user.kyc_status !== 'approved') {
        throw new AuthError(
          AuthErrorType.FORBIDDEN,
          'KYC approval required',
          403
        )
      }

      // Check admin requirement (assuming admin field exists or can be determined)
      if (requireAdmin) {
        // For now, we'll assume no admin system is implemented
        // This can be extended when admin roles are added
        throw new AuthError(
          AuthErrorType.FORBIDDEN,
          'Admin privileges required',
          403
        )
      }

      const authContext: AuthContext = {
        clerkUserId,
        user,
        isAuthenticated: true
      }

      return {
        success: true,
        context: authContext
      }
    }

    // Fallback - should not reach here
    throw new AuthError(
      AuthErrorType.UNAUTHORIZED,
      'Authentication failed',
      401
    )

  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode
      }
    }

    // Handle unexpected errors
    return {
      success: false,
      error: 'Internal authentication error',
      statusCode: 500
    }
  }
}

/**
 * Get authenticated user from request
 * Simplified version that throws on authentication failure
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthContext> {
  const result = await authenticateRequest(request, { required: true })
  
  if (!result.success || !result.context) {
    throw new AuthError(
      AuthErrorType.UNAUTHORIZED,
      result.error || 'Authentication failed',
      result.statusCode || 401
    )
  }

  return result.context
}

/**
 * Get user permissions based on authentication context
 */
export function getUserPermissions(authContext: AuthContext): AuthPermissions {
  const { user } = authContext

  return {
    canAccessOrders: true, // All authenticated users can access their orders
    canAccessWallet: true, // All authenticated users can access their wallet
    canAccessTransactions: true, // All authenticated users can access their transactions
    canPerformKYC: true, // All authenticated users can perform KYC
    isAdmin: false // No admin system implemented yet
  }
}

/**
 * Verify user can access specific resource
 */
export async function authorizeResourceAccess(
  authContext: AuthContext,
  resourceType: 'order' | 'wallet' | 'transaction',
  resourceId?: string
): Promise<boolean> {
  const permissions = getUserPermissions(authContext)

  switch (resourceType) {
    case 'order':
      return permissions.canAccessOrders
    case 'wallet':
      return permissions.canAccessWallet
    case 'transaction':
      return permissions.canAccessTransactions
    default:
      return false
  }
}

/**
 * Middleware wrapper for API routes
 * Usage: const authResult = await withAuth(request, { requireKYC: true })
 */
export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthResult> {
  return authenticateRequest(request, options)
}

/**
 * Extract bearer token from Authorization header
 * Note: With Clerk, we use their auth() function instead of manual token extraction
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Validate API key for service-to-service communication
 * This can be used for internal API calls or webhooks
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.EMAPAY_API_KEY

  if (!apiKey || !validApiKey) {
    return false
  }

  return apiKey === validApiKey
}
