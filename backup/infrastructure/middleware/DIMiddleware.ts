/**
 * Dependency Injection Middleware
 * 
 * Integrates the DI container with Next.js middleware for request-scoped services.
 * Provides request-specific service resolution and cleanup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '../di/Container'
import { ScopedServiceManager } from '../di/ServiceLocator'
import { v4 as uuidv4 } from 'uuid'

export interface RequestContext {
  requestId: string
  userId?: string
  startTime: number
  scopedServiceManager: ScopedServiceManager
  metadata: Record<string, any>
}

// Store request contexts
const requestContexts = new Map<string, RequestContext>()

/**
 * Create request context with scoped services
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = uuidv4()
  const startTime = Date.now()
  
  // Extract user ID from request if available
  const userId = extractUserIdFromRequest(request)
  
  // Create scoped service manager
  const scopedServiceManager = ScopedServiceManager.createRequestScope(requestId)
  
  const context: RequestContext = {
    requestId,
    userId,
    startTime,
    scopedServiceManager,
    metadata: {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      method: request.method,
      url: request.url
    }
  }
  
  requestContexts.set(requestId, context)
  
  return context
}

/**
 * Get request context by ID
 */
export function getRequestContext(requestId: string): RequestContext | undefined {
  return requestContexts.get(requestId)
}

/**
 * Cleanup request context
 */
export function cleanupRequestContext(requestId: string): void {
  const context = requestContexts.get(requestId)
  if (context) {
    // Clear scoped services
    context.scopedServiceManager.clearScope()
    
    // Remove from map
    requestContexts.delete(requestId)
    
    // Log request completion
    const duration = Date.now() - context.startTime
    console.log(`Request ${requestId} completed in ${duration}ms`)
  }
}

/**
 * Extract user ID from request
 */
function extractUserIdFromRequest(request: NextRequest): string | undefined {
  // Try to extract from authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // This would depend on your auth implementation
    // For Clerk, you might extract from the session token
    return undefined // Placeholder
  }
  
  // Try to extract from cookies
  const sessionCookie = request.cookies.get('__session')
  if (sessionCookie) {
    // Extract user ID from session cookie
    return undefined // Placeholder
  }
  
  return undefined
}

/**
 * DI Middleware for Next.js
 */
export function withDIMiddleware(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = createRequestContext(request)
    
    try {
      // Add request ID to response headers
      const response = await handler(request, context)
      response.headers.set('x-request-id', context.requestId)
      
      return response
    } catch (error) {
      console.error(`Request ${context.requestId} failed:`, error)
      throw error
    } finally {
      // Cleanup request context
      cleanupRequestContext(context.requestId)
    }
  }
}

/**
 * Enhanced Base Controller with DI Middleware support
 */
export abstract class DIAwareController {
  protected context?: RequestContext

  /**
   * Set request context
   */
  setContext(context: RequestContext): void {
    this.context = context
  }

  /**
   * Resolve service with request scope
   */
  protected resolveScoped<T>(serviceName: string): T {
    if (!this.context) {
      throw new Error('Request context not available')
    }
    
    return this.context.scopedServiceManager.resolve<T>(serviceName)
  }

  /**
   * Resolve singleton service
   */
  protected resolveSingleton<T>(serviceName: string): T {
    const container = getContainer()
    return container.resolve<T>(serviceName)
  }

  /**
   * Get request metadata
   */
  protected getRequestMetadata(): Record<string, any> {
    return this.context?.metadata || {}
  }

  /**
   * Get request ID
   */
  protected getRequestId(): string {
    return this.context?.requestId || 'unknown'
  }

  /**
   * Get user ID from context
   */
  protected getUserId(): string | undefined {
    return this.context?.userId
  }

  /**
   * Log with request context
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const requestId = this.getRequestId()
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${requestId}] [${level.toUpperCase()}] ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      default:
        console.log(logMessage)
        break
    }
  }
}

/**
 * Request-scoped service decorator
 */
export function RequestScoped(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        if (!this.context) {
          throw new Error('Request context not available for scoped service resolution')
        }
        return this.context.scopedServiceManager.resolve(serviceName)
      },
      enumerable: true,
      configurable: false
    })
  }
}

/**
 * Singleton service decorator
 */
export function Singleton(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => getContainer().resolve(serviceName),
      enumerable: true,
      configurable: false
    })
  }
}

/**
 * Cleanup middleware for long-running processes
 */
export function setupRequestContextCleanup(): void {
  // Cleanup old request contexts every 5 minutes
  setInterval(() => {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    for (const [requestId, context] of requestContexts.entries()) {
      if (now - context.startTime > maxAge) {
        cleanupRequestContext(requestId)
      }
    }
  }, 60 * 1000) // Run every minute
}

/**
 * Get request context statistics
 */
export function getRequestContextStats(): {
  activeRequests: number
  totalRequests: number
  averageRequestDuration: number
} {
  const activeRequests = requestContexts.size
  
  // This would need to be tracked separately for total requests
  // and average duration calculations
  return {
    activeRequests,
    totalRequests: 0, // Placeholder
    averageRequestDuration: 0 // Placeholder
  }
}

// Initialize cleanup on module load
setupRequestContextCleanup()
