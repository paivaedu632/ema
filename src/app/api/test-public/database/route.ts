// Public Database Test Endpoint (for testing purposes only)
// GET /api/test-public/database - Test database functions without authentication

import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { checkDatabaseHealth } from '@/lib/database-functions'

/**
 * GET /api/test-public/database
 * Test database connection and basic functions (no authentication required)
 * WARNING: This is for testing purposes only and should be removed in production
 */
export async function GET() {
  try {
    let connectionTest = false
    let connectionError = null
    let userCount = 0

    // Test basic database connection
    try {
      const { supabaseAdmin } = await import('@/lib/supabase-server')
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' })
        .limit(1)

      if (error) {
        connectionError = error.message
        connectionTest = false
      } else {
        connectionTest = true
        userCount = data?.length || 0
      }
    } catch (error) {
      connectionError = error instanceof Error ? error.message : 'Unknown error'
      connectionTest = false
    }

    // Test database health (simplified)
    let healthTest = false
    let healthError = null
    try {
      healthTest = await checkDatabaseHealth()
    } catch (error) {
      healthError = error instanceof Error ? error.message : 'Health check failed'
      healthTest = false
    }

    return createSuccessResponse({
      message: 'Database test completed',
      results: {
        connectionTest: connectionTest,
        connectionError: connectionError,
        userCount: userCount,
        healthTest: healthTest,
        healthError: healthError,
        timestamp: new Date().toISOString()
      }
    }, 'Database connection test completed')

  } catch (error) {
    return handleApiError(error, { endpoint: 'GET /api/test-public/database' })
  }
}
