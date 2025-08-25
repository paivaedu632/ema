// EmaPay API Response Standardization
// Provides consistent response formatting for all API endpoints

import { NextResponse } from 'next/server'

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = any> {
  /** Indicates successful operation */
  success: true
  /** Response data payload */
  data?: T
  /** Optional success message */
  message?: string
  /** Response timestamp */
  timestamp: string
  /** Optional metadata */
  meta?: Record<string, any>
}

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  /** Indicates failed operation */
  success: false
  /** Error message for display */
  error: string
  /** Optional error details (only in development) */
  details?: string
  /** Response timestamp */
  timestamp: string
  /** Optional error code */
  code?: string
  /** Optional validation errors */
  validationErrors?: Array<{ field: string; message: string }>
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number */
  page: number
  /** Items per page */
  limit: number
  /** Total number of items */
  total: number
  /** Total number of pages */
  totalPages: number
  /** Whether there are more pages */
  hasMore: boolean
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status = 200,
  meta?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      meta
    },
    { status }
  )
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status = 500,
  details?: string,
  code?: string,
  validationErrors?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  }

  // Only include details in development environment
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details
  }

  // Add optional fields if provided
  if (code) {
    response.code = code
  }

  if (validationErrors) {
    response.validationErrors = validationErrors
  }

  return NextResponse.json(response, { status })
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiSuccessResponse<T[]>> {
  const totalPages = Math.ceil(total / limit)
  
  return createSuccessResponse(
    data,
    message,
    200,
    {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    }
  )
}

/**
 * Create a created resource response (201)
 */
export function createCreatedResponse<T>(
  data: T,
  message = 'Resource created successfully'
): NextResponse<ApiSuccessResponse<T>> {
  return createSuccessResponse(data, message, 201)
}

/**
 * Create a no content response (204)
 */
export function createNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Create a bad request response (400)
 */
export function createBadRequestResponse(
  error: string,
  details?: string,
  validationErrors?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 400, details, 'BAD_REQUEST', validationErrors)
}

/**
 * Create an unauthorized response (401)
 */
export function createUnauthorizedResponse(
  error = 'Authentication required'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 401, undefined, 'UNAUTHORIZED')
}

/**
 * Create a forbidden response (403)
 */
export function createForbiddenResponse(
  error = 'Access denied'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 403, undefined, 'FORBIDDEN')
}

/**
 * Create a not found response (404)
 */
export function createNotFoundResponse(
  error = 'Resource not found'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 404, undefined, 'NOT_FOUND')
}

/**
 * Create a conflict response (409)
 */
export function createConflictResponse(
  error = 'Resource already exists',
  details?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 409, details, 'CONFLICT')
}

/**
 * Create a validation error response (422)
 */
export function createValidationErrorResponse(
  validationErrors: Array<{ field: string; message: string }>,
  error = 'Validation failed'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 422, undefined, 'VALIDATION_ERROR', validationErrors)
}

/**
 * Create a server error response (500)
 */
export function createServerErrorResponse(
  error = 'Internal server error',
  details?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 500, details, 'SERVER_ERROR')
}

/**
 * Create a service unavailable response (503)
 */
export function createServiceUnavailableResponse(
  error = 'Service temporarily unavailable',
  details?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 503, details, 'SERVICE_UNAVAILABLE')
}

/**
 * Create a response with custom status code
 */
export function createCustomResponse<T>(
  data: T,
  status: number,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  return createSuccessResponse(data, message, status)
}

/**
 * Format a list of items for response
 */
export function formatListResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    }
  }
}
