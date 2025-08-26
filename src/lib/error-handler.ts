// EmaPay Global Error Handler
// Comprehensive error handling for API routes

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthError, AuthErrorType } from '@/types/auth'
import { ApiError, ApiErrorResponse, createErrorResponse } from '@/lib/api-utils'

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better error tracking
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system'
}

/**
 * Enhanced error information for logging and debugging
 */
export interface ErrorInfo {
  category: ErrorCategory
  severity: ErrorSeverity
  userMessage: string
  technicalMessage: string
  statusCode: number
  context?: Record<string, any>
}

/**
 * Error mapping configuration
 */
const ERROR_MAPPINGS: Record<string, ErrorInfo> = {
  // Authentication Errors
  [AuthErrorType.MISSING_TOKEN]: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Authentication required',
    technicalMessage: 'Missing authentication token',
    statusCode: 401
  },
  [AuthErrorType.INVALID_TOKEN]: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Invalid authentication token',
    technicalMessage: 'Invalid authentication token',
    statusCode: 401
  },
  [AuthErrorType.USER_NOT_FOUND]: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    userMessage: 'User not found',
    technicalMessage: 'User not found in database',
    statusCode: 404
  },
  [AuthErrorType.UNAUTHORIZED]: {
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Unauthorized',
    technicalMessage: 'Unauthorized access attempt',
    statusCode: 401
  },
  [AuthErrorType.FORBIDDEN]: {
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Access denied',
    technicalMessage: 'Forbidden access attempt',
    statusCode: 403
  }
}

/**
 * Database error patterns and their mappings
 */
const DATABASE_ERROR_PATTERNS = [
  {
    pattern: /insufficient.*balance/i,
    info: {
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      userMessage: 'Saldo insuficiente',
      technicalMessage: 'Insufficient balance for transaction',
      statusCode: 400
    }
  },
  {
    pattern: /duplicate key value/i,
    info: {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.LOW,
      userMessage: 'Record already exists',
      technicalMessage: 'Duplicate key constraint violation',
      statusCode: 409
    }
  },
  {
    pattern: /foreign key constraint/i,
    info: {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Invalid reference',
      technicalMessage: 'Foreign key constraint violation',
      statusCode: 400
    }
  },
  {
    pattern: /connection.*refused/i,
    info: {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.CRITICAL,
      userMessage: 'Service temporarily unavailable',
      technicalMessage: 'Database connection refused',
      statusCode: 503
    }
  }
]

/**
 * Get error information from error object
 */
function getErrorInfo(error: unknown): ErrorInfo {
  // Handle AuthError
  if (error instanceof AuthError) {
    return ERROR_MAPPINGS[error.type] || {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      userMessage: error.message,
      technicalMessage: error.message,
      statusCode: error.statusCode
    }
  }

  // Handle ApiError
  if (error instanceof ApiError) {
    return {
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      userMessage: error.message,
      technicalMessage: error.details || error.message,
      statusCode: error.status
    }
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0]
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: firstError.message,
      technicalMessage: `Validation failed: ${firstError.path.join('.')} - ${firstError.message}`,
      statusCode: 400,
      context: { validationErrors: error.errors }
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for database error patterns
    for (const { pattern, info } of DATABASE_ERROR_PATTERNS) {
      if (pattern.test(error.message)) {
        return {
          ...info,
          context: { originalMessage: error.message }
        }
      }
    }

    // Default Error handling
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Erro interno do servidor',
      technicalMessage: error.message,
      statusCode: 500,
      context: { stack: error.stack }
    }
  }

  // Handle unknown errors
  return {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    userMessage: 'Erro interno do servidor',
    technicalMessage: 'Unknown error occurred',
    statusCode: 500,
    context: { error: String(error) }
  }
}

/**
 * Log error with appropriate level based on severity
 */
function logError(errorInfo: ErrorInfo, context?: Record<string, any>) {
  const logData = {
    category: errorInfo.category,
    severity: errorInfo.severity,
    userMessage: errorInfo.userMessage,
    technicalMessage: errorInfo.technicalMessage,
    statusCode: errorInfo.statusCode,
    timestamp: new Date().toISOString(),
    context: { ...errorInfo.context, ...context }
  }

  switch (errorInfo.severity) {
    case ErrorSeverity.LOW:
      console.info('🔵 API Error (Low):', logData)
      break
    case ErrorSeverity.MEDIUM:
      console.warn('🟡 API Error (Medium):', logData)
      break
    case ErrorSeverity.HIGH:
      console.error('🟠 API Error (High):', logData)
      break
    case ErrorSeverity.CRITICAL:
      console.error('🔴 API Error (Critical):', logData)
      break
  }
}

/**
 * Main error handler for API routes
 */
export function handleApiError(
  error: unknown,
  context?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  const errorInfo = getErrorInfo(error)
  
  // Log the error
  logError(errorInfo, context)

  // Create response
  return createErrorResponse(
    errorInfo.userMessage,
    errorInfo.statusCode,
    process.env.NODE_ENV === 'development' ? errorInfo.technicalMessage : undefined
  )
}

/**
 * Specialized error handlers for specific error types
 */
export const ErrorHandlers = {
  /**
   * Handle authentication errors
   */
  auth: (error: AuthError, context?: Record<string, any>) => {
    return handleApiError(error, { ...context, errorType: 'authentication' })
  },

  /**
   * Handle validation errors
   */
  validation: (error: z.ZodError, context?: Record<string, any>) => {
    return handleApiError(error, { ...context, errorType: 'validation' })
  },

  /**
   * Handle database errors
   */
  database: (error: Error, context?: Record<string, any>) => {
    return handleApiError(error, { ...context, errorType: 'database' })
  },

  /**
   * Handle business logic errors
   */
  business: (error: ApiError, context?: Record<string, any>) => {
    return handleApiError(error, { ...context, errorType: 'business' })
  }
}

/**
 * Error boundary for async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw error // Re-throw to be handled by route handler
  }
}

/**
 * Create custom API error
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): ApiError {
  const error = new ApiError(message, statusCode)
  
  // Add metadata for error handling
  ;(error as any).category = category
  ;(error as any).severity = severity
  
  return error
}

/**
 * Validation error helper
 */
export function createValidationError(message: string, field?: string): ApiError {
  return createApiError(
    message,
    400,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW
  )
}

/**
 * Business logic error helper
 */
export function createBusinessError(message: string, statusCode: number = 400): ApiError {
  return createApiError(
    message,
    statusCode,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.LOW
  )
}
