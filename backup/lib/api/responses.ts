import { NextResponse } from 'next/server';

// Standard response interfaces
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error codes
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Business logic errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_PIN: 'INVALID_PIN',
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  ORDER_FAILED: 'ORDER_FAILED',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message })
  };

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
    ...(code && { code }),
    ...(details ? { details } : {})
  };

  // Log error for debugging (but don't expose sensitive details)
  console.error('API Error:', { error, code, status, details });

  return NextResponse.json(response, { status });
}

/**
 * Create specific error responses
 */
export const ErrorResponses = {
  authRequired: (message = 'Authentication required') =>
    createErrorResponse(message, ErrorCodes.AUTH_REQUIRED, 401),

  invalidToken: (message = 'Invalid authentication token') =>
    createErrorResponse(message, ErrorCodes.INVALID_TOKEN, 401),

  validationError: (message: string, details?: unknown) =>
    createErrorResponse(message, ErrorCodes.VALIDATION_ERROR, 400, details),

  invalidInput: (message: string) =>
    createErrorResponse(message, ErrorCodes.INVALID_INPUT, 400),

  insufficientBalance: (message = 'Insufficient balance') =>
    createErrorResponse(message, ErrorCodes.INSUFFICIENT_BALANCE, 400),

  userNotFound: (message = 'User not found') =>
    createErrorResponse(message, ErrorCodes.USER_NOT_FOUND, 404),

  invalidPin: (message = 'Invalid PIN') =>
    createErrorResponse(message, ErrorCodes.INVALID_PIN, 400),

  transferFailed: (message = 'Transfer failed') =>
    createErrorResponse(message, ErrorCodes.TRANSFER_FAILED, 400),

  orderFailed: (message = 'Order failed') =>
    createErrorResponse(message, ErrorCodes.ORDER_FAILED, 400),

  databaseError: (message = 'Database operation failed') =>
    createErrorResponse(message, ErrorCodes.DATABASE_ERROR, 500),

  internalError: (message = 'Internal server error') =>
    createErrorResponse(message, ErrorCodes.INTERNAL_ERROR, 500),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    createErrorResponse(message, ErrorCodes.SERVICE_UNAVAILABLE, 503),

  notFound: (message = 'Resource not found') =>
    createErrorResponse(message, 'NOT_FOUND', 404),

  methodNotAllowed: (message = 'Method not allowed') =>
    createErrorResponse(message, 'METHOD_NOT_ALLOWED', 405)
};

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('Unhandled API error:', error);

  // Handle known error types
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('authentication')) {
      return ErrorResponses.authRequired();
    }
    
    if (error.message.includes('validation')) {
      return ErrorResponses.validationError(error.message);
    }
    
    if (error.message.includes('database')) {
      return ErrorResponses.databaseError();
    }

    // Generic error with message
    return ErrorResponses.internalError(
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }

  // Unknown error type
  return ErrorResponses.internalError();
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
