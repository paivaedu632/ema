// Consolidated API utilities
// Merged from src/lib/api/cors.ts and src/lib/api/responses.ts

import { NextRequest, NextResponse } from 'next/server'

// CORS Configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function corsHeaders() {
  return CORS_HEADERS
}

export function handleCors(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: CORS_HEADERS,
    })
  }
  return null
}

// API Response Utilities
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  } as ApiResponse<T>)
}

export function errorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error,
  } as ApiResponse, { status })
}



export function validationErrorResponse(errors: Record<string, string>): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Validation failed',
    data: errors,
  } as ApiResponse, { status: 422 })
}

// HTTP Client utilities
export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = '/api/v1', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      return data
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  setAuthToken(token: string) {
    this.defaultHeaders.Authorization = `Bearer ${token}`
  }

  removeAuthToken() {
    delete this.defaultHeaders.Authorization
  }
}

// Default API client instance
export const apiClient = new ApiClient()

// Historical API response functions for compatibility
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message })
  }, { status })
}

export function createErrorResponse(error: string, code?: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    ...(code && { code })
  }, { status })
}

// Historical ErrorResponses object for compatibility
export const ErrorResponses = {
  validationError: (message: string) => createErrorResponse(message, 'VALIDATION_ERROR', 400),
  insufficientBalance: (message: string) => createErrorResponse(message, 'INSUFFICIENT_BALANCE', 400),
  orderFailed: (message: string) => createErrorResponse(message, 'ORDER_FAILED', 400),
  authRequired: () => createErrorResponse('Authentication required', 'AUTH_REQUIRED', 401),
  invalidToken: () => createErrorResponse('Invalid authentication token', 'INVALID_TOKEN', 401),
  databaseError: (message: string) => createErrorResponse(message, 'DATABASE_ERROR', 500),
  internalError: () => createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500)
}

// Historical error handling wrapper
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      return ErrorResponses.internalError();
    }
  };
}

// CORS middleware wrapper
export function withCors(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Handle preflight requests
    const corsResponse = handleCors(request)
    if (corsResponse) {
      return corsResponse
    }

    // Execute the handler
    const response = await handler(request, ...args)

    // Add CORS headers to the response
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}


