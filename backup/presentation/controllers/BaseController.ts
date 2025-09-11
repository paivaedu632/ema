/**
 * Base Controller
 * 
 * Provides common functionality for API controllers including:
 * - Request validation
 * - Authentication handling
 * - Response formatting
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server'
// Clerk removed - using Supabase Auth
import { 
  Result, 
  ErrorResult, 
  SuccessResult, 
  ErrorCodes 
} from '../../application/common/UseCase'

export interface AuthenticatedUser {
  id: string
  email: string
  clerkUserId: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  details?: Record<string, any>
  timestamp: string
}

export abstract class BaseController {
  /**
   * Get authenticated user from request
   */
  protected async getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser> {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('User not authenticated')
    }

    // In a real implementation, you might want to fetch user details from your database
    // For now, we'll use the Clerk user ID and extract email from the request or token
    return {
      id: userId,
      email: '', // Would be populated from user repository
      clerkUserId: userId
    }
  }

  /**
   * Parse and validate JSON request body
   */
  protected async parseRequestBody<T>(request: NextRequest): Promise<T> {
    try {
      const body = await request.json()
      return body as T
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }
  }

  /**
   * Extract query parameters from request
   */
  protected getQueryParams(request: NextRequest): Record<string, string> {
    const url = new URL(request.url)
    const params: Record<string, string> = {}
    
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  }

  /**
   * Extract path parameters from request URL
   */
  protected getPathParams(request: NextRequest, pattern: string): Record<string, string> {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const patternSegments = pattern.split('/').filter(Boolean)
    
    const params: Record<string, string> = {}
    
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i]
      if (patternSegment.startsWith('[') && patternSegment.endsWith(']')) {
        const paramName = patternSegment.slice(1, -1)
        params[paramName] = pathSegments[i] || ''
      }
    }
    
    return params
  }

  /**
   * Create success response
   */
  protected createSuccessResponse<T>(
    data: T,
    status: number = 200
  ): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response, { status })
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    error: string,
    errorCode: string,
    status: number = 400,
    details?: Record<string, any>
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error,
      errorCode,
      details,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response, { status })
  }

  /**
   * Convert use case result to HTTP response
   */
  protected handleUseCaseResult<T>(
    result: SuccessResult<T> | ErrorResult
  ): NextResponse<ApiResponse<T>> {
    if (result.success) {
      return this.createSuccessResponse(result.data)
    }

    // Map error codes to HTTP status codes
    const statusCode = this.getHttpStatusFromErrorCode(result.errorCode)
    
    return this.createErrorResponse(
      result.error,
      result.errorCode,
      statusCode,
      result.details
    )
  }

  /**
   * Handle unexpected errors
   */
  protected handleUnexpectedError(error: unknown): NextResponse<ApiResponse> {
    console.error('Unexpected error in API controller:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    
    return this.createErrorResponse(
      errorMessage,
      ErrorCodes.UNEXPECTED_ERROR,
      500
    )
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequiredFields(
    body: Record<string, any>,
    requiredFields: string[]
  ): string[] {
    const missingFields: string[] = []
    
    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        missingFields.push(field)
      }
    }
    
    return missingFields
  }

  /**
   * Map error codes to HTTP status codes
   */
  private getHttpStatusFromErrorCode(errorCode: string): number {
    switch (errorCode) {
      case ErrorCodes.INVALID_INPUT:
      case ErrorCodes.REQUIRED_FIELD_MISSING:
      case ErrorCodes.INVALID_FORMAT:
        return 400 // Bad Request
        
      case ErrorCodes.USER_NOT_FOUND:
      case ErrorCodes.WALLET_NOT_FOUND:
      case ErrorCodes.TRANSACTION_NOT_FOUND:
        return 404 // Not Found
        
      case ErrorCodes.KYC_REQUIRED:
      case ErrorCodes.USER_NOT_ACTIVE:
        return 403 // Forbidden
        
      case ErrorCodes.INSUFFICIENT_BALANCE:
      case ErrorCodes.TRANSACTION_LIMIT_EXCEEDED:
        return 422 // Unprocessable Entity
        
      case ErrorCodes.EXTERNAL_SERVICE_ERROR:
        return 502 // Bad Gateway
        
      case ErrorCodes.DATABASE_ERROR:
      case ErrorCodes.UNEXPECTED_ERROR:
        return 500 // Internal Server Error
        
      default:
        return 400 // Default to Bad Request
    }
  }

  /**
   * Execute controller action with error handling
   */
  protected async executeWithErrorHandling<T>(
    action: () => Promise<NextResponse<ApiResponse<T>>>
  ): Promise<NextResponse<ApiResponse<T>>> {
    try {
      return await action()
    } catch (error) {
      return this.handleUnexpectedError(error) as NextResponse<ApiResponse<T>>
    }
  }
}
