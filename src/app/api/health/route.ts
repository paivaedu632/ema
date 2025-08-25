// Health Check API Endpoint
// GET /api/health - Basic server health check (no authentication required)

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'

/**
 * GET /api/health
 * Basic health check endpoint that doesn't require authentication
 */
export async function GET(request: NextRequest) {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'EmaPay API',
    version: '1.0.0'
  }, 'Server is healthy')
}
