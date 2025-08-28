// Test endpoint for authentication middleware and validation system
// GET /api/auth/test - Test authentication system
// POST /api/auth/test - Test validation system

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { createUserContext, getUserContextSummary } from '@/middleware/user-context'
import { validateRequestBody, PlaceOrderSchema } from '@/lib/validation'
import { handleApiError as globalHandleApiError } from '@/lib/error-handler'

/**
 * GET /api/auth/test
 * Test endpoint to verify authentication middleware functionality
 */
export async function GET(request: NextRequest) {
  try {
    // Test authentication middleware
    const authContext = await getAuthenticatedUserFromRequest(request)

    // Test user context creation
    const userContext = await createUserContext(authContext)

    // Create summary for response
    const contextSummary = getUserContextSummary(userContext)

    return createSuccessResponse({
      message: 'Authentication test successful',
      authContext: {
        isAuthenticated: authContext.isAuthenticated,
        clerkUserId: authContext.clerkUserId,
        userId: authContext.user.id,
        userEmail: authContext.user.email
      },
      userContext: contextSummary
    }, 'Authentication middleware working correctly')

  } catch (error) {
    return globalHandleApiError(error, { endpoint: 'GET /api/auth/test' })
  }
}

/**
 * POST /api/auth/test
 * Test endpoint to verify validation system functionality
 *
 * Example request body for testing order validation:
 * {
 *   "side": "buy",
 *   "type": "limit",
 *   "base_currency": "EUR",
 *   "quote_currency": "AOA",
 *   "quantity": 100,
 *   "price": 1200
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Test authentication
    const authContext = await getAuthenticatedUserFromRequest(request)

    // Test validation with order placement schema
    const validatedData = await validateRequestBody(request, PlaceOrderSchema)

    // Test user context creation
    const userContext = await createUserContext(authContext)

    return createSuccessResponse({
      message: 'Validation test successful',
      userId: authContext.user.id,
      validatedData,
      validationPassed: true,
      userContext: {
        kycCompleted: userContext.kycCompleted,
        walletCount: userContext.wallets.length,
        permissions: userContext.permissions
      }
    }, 'Request validation and user context working correctly')

  } catch (error) {
    return globalHandleApiError(error, { endpoint: 'POST /api/auth/test' })
  }
}
