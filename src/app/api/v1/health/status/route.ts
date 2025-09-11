
import { checkDatabaseHealth } from '@/lib/database/functions';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';

async function healthHandler() {
  // Check database connectivity
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.success) {
    return createErrorResponse(
      'Database connection failed',
      'DATABASE_ERROR',
      503
    );
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      status: 'connected',
      timestamp: dbHealth.data?.timestamp
    },
    environment: process.env.NODE_ENV || 'development'
  };

  return createSuccessResponse(healthData, 'System is healthy');
}

export const GET = withCors(withErrorHandling(healthHandler));
