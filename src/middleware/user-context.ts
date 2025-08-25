// EmaPay User Context Middleware
// Provides user context extraction and management for API routes

import { NextRequest } from 'next/server'
import { getUserWallets } from '@/lib/supabase'
import { 
  AuthContext, 
  AuthenticatedRequest, 
  AuthPermissions,
  AuthError,
  AuthErrorType
} from '@/types/auth'
import { getUserPermissions } from './auth'
import { WalletBalance } from '@/types/emapay.types'

/**
 * Enhanced user context with additional user data
 */
export interface UserContext extends AuthContext {
  /** User wallet balances */
  wallets: WalletBalance[]
  /** User permissions */
  permissions: AuthPermissions
  /** KYC completion status */
  kycCompleted: boolean
  /** User registration date */
  registeredAt: Date
}

/**
 * Create enhanced user context from authentication context
 */
export async function createUserContext(authContext: AuthContext): Promise<UserContext> {
  const { user } = authContext

  try {
    // Fetch user wallets
    const { data: wallets, error: walletsError } = await getUserWallets(user.id)
    
    if (walletsError) {
      throw new AuthError(
        AuthErrorType.USER_NOT_FOUND,
        'Failed to load user wallets',
        500
      )
    }

    // Transform wallet data to match expected format
    const walletBalances: WalletBalance[] = (wallets || []).map(wallet => ({
      currency: wallet.currency as 'EUR' | 'AOA',
      available_balance: parseFloat(wallet.available_balance?.toString() || '0'),
      reserved_balance: parseFloat(wallet.reserved_balance?.toString() || '0')
    }))

    // Get user permissions
    const permissions = getUserPermissions(authContext)

    // Create enhanced context
    const userContext: UserContext = {
      ...authContext,
      wallets: walletBalances,
      permissions,
      kycCompleted: user.kyc_status === 'approved',
      registeredAt: new Date(user.created_at)
    }

    return userContext

  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }

    throw new AuthError(
      AuthErrorType.USER_NOT_FOUND,
      'Failed to create user context',
      500
    )
  }
}

/**
 * Get user wallet balance for specific currency
 */
export function getUserWalletBalance(
  userContext: UserContext, 
  currency: 'EUR' | 'AOA'
): WalletBalance | null {
  return userContext.wallets.find(wallet => wallet.currency === currency) || null
}

/**
 * Check if user has sufficient balance for transaction
 */
export function hassufficientBalance(
  userContext: UserContext,
  currency: 'EUR' | 'AOA',
  amount: number
): boolean {
  const wallet = getUserWalletBalance(userContext, currency)
  
  if (!wallet) {
    return false
  }

  return wallet.available_balance >= amount
}

/**
 * Get total balance (available + reserved) for currency
 */
export function getTotalBalance(
  userContext: UserContext,
  currency: 'EUR' | 'AOA'
): number {
  const wallet = getUserWalletBalance(userContext, currency)
  
  if (!wallet) {
    return 0
  }

  return wallet.available_balance + wallet.reserved_balance
}

/**
 * Validate user can perform specific action
 */
export function canPerformAction(
  userContext: UserContext,
  action: 'place_order' | 'cancel_order' | 'send_money' | 'kyc_submit'
): boolean {
  const { permissions, kycCompleted } = userContext

  switch (action) {
    case 'place_order':
      // Orders require KYC completion (based on user preferences)
      return permissions.canAccessOrders && kycCompleted
    
    case 'cancel_order':
      return permissions.canAccessOrders
    
    case 'send_money':
      // Sending money requires KYC completion
      return permissions.canAccessWallet && kycCompleted
    
    case 'kyc_submit':
      return permissions.canPerformKYC
    
    default:
      return false
  }
}

/**
 * Create authenticated request object with user context
 */
export async function createAuthenticatedRequest(
  request: NextRequest,
  authContext: AuthContext
): Promise<AuthenticatedRequest> {
  const userContext = await createUserContext(authContext)

  return {
    auth: authContext,
    permissions: userContext.permissions
  }
}

/**
 * Middleware to extract and validate user ID from context
 */
export function extractUserId(authContext: AuthContext): string {
  if (!authContext.isAuthenticated || !authContext.user) {
    throw new AuthError(
      AuthErrorType.UNAUTHORIZED,
      'User not authenticated',
      401
    )
  }

  return authContext.user.id
}

/**
 * Middleware to extract Clerk user ID from context
 */
export function extractClerkUserId(authContext: AuthContext): string {
  if (!authContext.isAuthenticated || !authContext.clerkUserId) {
    throw new AuthError(
      AuthErrorType.UNAUTHORIZED,
      'Clerk user ID not available',
      401
    )
  }

  return authContext.clerkUserId
}

/**
 * Get user display information
 */
export function getUserDisplayInfo(authContext: AuthContext) {
  const { user } = authContext

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    kycStatus: user.kyc_status,
    createdAt: user.created_at
  }
}

/**
 * Validate user ownership of resource
 */
export function validateResourceOwnership(
  authContext: AuthContext,
  resourceUserId: string
): boolean {
  return authContext.user.id === resourceUserId
}

/**
 * Create user context summary for logging/debugging
 */
export function createUserContextSummary(userContext: UserContext) {
  return {
    userId: userContext.user.id,
    clerkUserId: userContext.clerkUserId,
    email: userContext.user.email,
    kycStatus: userContext.user.kyc_status,
    kycCompleted: userContext.kycCompleted,
    walletCount: userContext.wallets.length,
    permissions: userContext.permissions,
    registeredAt: userContext.registeredAt.toISOString()
  }
}
