// EmaPay API Authentication Types
// Based on Clerk JWT authentication system

import { User } from '@/lib/supabase'

/**
 * Authentication context for API requests
 */
export interface AuthContext {
  /** Clerk user ID */
  clerkUserId: string
  /** EmaPay user record from database */
  user: User
  /** Whether the user is authenticated */
  isAuthenticated: boolean
}

/**
 * Authentication result from middleware
 */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean
  /** Authentication context if successful */
  context?: AuthContext
  /** Error message if authentication failed */
  error?: string
  /** HTTP status code for error response */
  statusCode?: number
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN'
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    public message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Authorization permissions for different resources
 */
export interface AuthPermissions {
  /** Can access own orders */
  canAccessOrders: boolean
  /** Can access own wallet */
  canAccessWallet: boolean
  /** Can access own transactions */
  canAccessTransactions: boolean
  /** Can perform KYC operations */
  canPerformKYC: boolean
  /** Can access admin features */
  isAdmin: boolean
}

/**
 * Request context with authentication information
 */
export interface AuthenticatedRequest {
  /** Authentication context */
  auth: AuthContext
  /** User permissions */
  permissions: AuthPermissions
}

/**
 * Authentication middleware options
 */
export interface AuthMiddlewareOptions {
  /** Whether to require authentication (default: true) */
  required?: boolean
  /** Whether to require KYC approval (default: false) */
  requireKYC?: boolean
  /** Whether to require admin privileges (default: false) */
  requireAdmin?: boolean
}

/**
 * JWT token payload structure from Clerk
 */
export interface ClerkJWTPayload {
  /** Clerk user ID */
  sub: string
  /** Issued at timestamp */
  iat: number
  /** Expiration timestamp */
  exp: number
  /** Issuer */
  iss: string
  /** Audience */
  aud: string
  /** Session ID */
  sid?: string
  /** Additional claims */
  [key: string]: any
}

/**
 * User session information
 */
export interface UserSession {
  /** Session ID */
  sessionId: string
  /** User ID */
  userId: string
  /** Session creation time */
  createdAt: Date
  /** Session expiration time */
  expiresAt: Date
  /** Whether session is active */
  isActive: boolean
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** JWT secret key */
  jwtSecret: string
  /** Token expiration time */
  tokenExpiration: string
  /** Whether to verify token signature */
  verifySignature: boolean
  /** Allowed token issuers */
  allowedIssuers: string[]
}
