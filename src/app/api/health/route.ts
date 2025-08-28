// Health Check API Endpoint
// GET /api/health - Basic server health check (no authentication required)

import { createSuccessResponse } from '@/lib/api-response'

/**
 * GET /api/health
 * Basic health check endpoint that doesn't require authentication
 */
export async function GET() {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'EmaPay API',
    version: '1.0.0'
  }, 'Server is healthy')
}
