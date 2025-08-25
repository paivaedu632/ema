import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/supabase-server'
import { TRANSACTION_LIMITS, VALIDATION_MESSAGES, type Currency } from '@/utils/transaction-validation'
import { AuthContext, AuthError, AuthErrorType } from '@/types/auth'
import { getAuthenticatedUser } from '@/middleware/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createCreatedResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse
} from '@/lib/api-response'
import { handleApiError as globalHandleApiError } from '@/lib/error-handler'

// ===== RE-EXPORT RESPONSE TYPES AND BUILDERS =====
// Note: These are now imported from @/lib/api-response for consistency

export type { ApiSuccessResponse, ApiErrorResponse } from '@/lib/api-response'
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createCreatedResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api-response'

// ===== AUTHENTICATION UTILITIES =====

/**
 * Get authenticated user with standardized error handling
 * @deprecated Use getAuthenticatedUser from @/middleware/auth instead
 */
export async function getAuthenticatedUserLegacy() {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    throw new ApiError('Unauthorized', 401)
  }

  const { data: user, error: userError } = await getUserByClerkId(clerkUserId)

  if (userError || !user) {
    throw new ApiError('User not found', 404)
  }

  return { user, clerkUserId }
}

/**
 * Get authenticated user using new authentication middleware
 */
export async function getAuthenticatedUserFromRequest(request: NextRequest): Promise<AuthContext> {
  try {
    return await getAuthenticatedUser(request)
  } catch (error) {
    if (error instanceof AuthError) {
      throw new ApiError(error.message, error.statusCode)
    }
    throw new ApiError('Authentication failed', 401)
  }
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate amount input with optional currency-specific limits
 */
export function validateAmount(amount: any, currency?: Currency, fieldName = 'amount'): number {
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new ApiError(`Invalid ${fieldName}. Must be a positive number.`, 400)
  }

  const numAmount = Number(amount)

  // Apply currency-specific limits if currency is provided
  if (currency) {
    const limits = TRANSACTION_LIMITS[currency]
    if (numAmount < limits.min) {
      throw new ApiError(VALIDATION_MESSAGES.AMOUNT.MIN(limits.min, currency), 400)
    }
    if (numAmount > limits.max) {
      throw new ApiError(VALIDATION_MESSAGES.AMOUNT.MAX(limits.max, currency), 400)
    }
  }

  return numAmount
}

/**
 * Validate currency input
 */
export function validateCurrency(currency: any): Currency {
  if (!currency || !['EUR', 'AOA'].includes(currency)) {
    throw new ApiError(VALIDATION_MESSAGES.CURRENCY.INVALID, 400)
  }
  return currency as Currency
}

/**
 * Validate exchange rate input
 */
export function validateExchangeRate(exchangeRate: any): number | null {
  if (!exchangeRate) return null

  if (isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0) {
    throw new ApiError('Invalid exchange rate. Must be a positive number.', 400)
  }
  return Number(exchangeRate)
}

/**
 * Validate exchange rate input (required version for sell offers)
 */
export function validateRequiredExchangeRate(exchangeRate: any): number {
  if (!exchangeRate || isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0) {
    throw new ApiError(VALIDATION_MESSAGES.EXCHANGE_RATE.INVALID_POSITIVE, 400)
  }
  return Number(exchangeRate)
}

/**
 * Validate recipient information for send transactions
 */
export function validateRecipient(recipient: any): { name: string; email: string } {
  if (!recipient || !recipient.name || !recipient.email) {
    throw new ApiError('Recipient information is required (name and email).', 400)
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(recipient.email)) {
    throw new ApiError('Invalid recipient email format.', 400)
  }

  return {
    name: recipient.name.trim(),
    email: recipient.email.trim().toLowerCase()
  }
}

// ===== ERROR HANDLING =====

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Handle API errors with standardized responses
 * @deprecated Use handleApiError from @/lib/error-handler instead
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  return globalHandleApiError(error)
}

/**
 * Handle authentication errors specifically
 * @deprecated Use ErrorHandlers.auth from @/lib/error-handler instead
 */
export function handleAuthError(error: AuthError): NextResponse<ApiErrorResponse> {
  const errorMessages = {
    [AuthErrorType.MISSING_TOKEN]: 'Token de autenticação necessário',
    [AuthErrorType.INVALID_TOKEN]: 'Token de autenticação inválido',
    [AuthErrorType.USER_NOT_FOUND]: 'Usuário não encontrado',
    [AuthErrorType.UNAUTHORIZED]: 'Não autorizado',
    [AuthErrorType.FORBIDDEN]: 'Acesso negado'
  }

  const message = errorMessages[error.type] || error.message

  return createErrorResponse(message, error.statusCode)
}

// ===== REQUEST BODY PARSING =====

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json()
  } catch (error) {
    throw new ApiError('Invalid JSON in request body', 400)
  }
}

// ===== TRANSACTION ERROR HANDLING =====

/**
 * Handle transaction-specific errors with localized messages
 */
export function handleTransactionError(
  error: any,
  transactionType: 'buy' | 'sell' | 'send'
): never {
  const message = error.message || ''

  // Handle insufficient balance errors
  if (message.includes('Insufficient EUR balance')) {
    throw new ApiError('Saldo EUR insuficiente para esta transação.', 400)
  }
  
  if (message.includes('Insufficient AOA balance')) {
    throw new ApiError('Saldo AOA insuficiente para esta transação.', 400)
  }
  
  if (message.includes('Insufficient')) {
    throw new ApiError('Saldo insuficiente para esta transação.', 400)
  }

  // Handle exchange rate errors
  if (message.includes('Exchange rate not available')) {
    throw new ApiError('Taxa de câmbio não disponível. Tente novamente.', 503)
  }

  // Handle wallet errors
  if (message.includes('Wallet not found')) {
    throw new ApiError('Carteira não encontrada.', 404)
  }

  // Default transaction error messages
  const defaultMessages = {
    buy: 'Falha ao processar transação de compra.',
    sell: 'Falha ao processar transação de venda.',
    send: 'Falha ao processar transação de envio.'
  }

  throw new ApiError(defaultMessages[transactionType], 500, message)
}

/**
 * Handle sell offer creation errors with localized messages
 */
export function handleSellOfferError(error: any): never {
  const message = error.message || ''

  // Handle insufficient balance errors
  if (message.includes('Insufficient available balance')) {
    throw new ApiError('Saldo insuficiente para criar a oferta', 400)
  }

  // Handle exchange rate validation errors
  if (message.includes('Exchange rate') && message.includes('outside acceptable range')) {
    throw new ApiError('Taxa de câmbio fora do intervalo aceitável', 400)
  }

  // Handle wallet errors
  if (message.includes('Wallet not found')) {
    throw new ApiError('Carteira não encontrada', 404)
  }

  // Default sell offer error
  throw new ApiError('Falha ao criar oferta de venda', 500, message)
}

// ===== RESPONSE FORMATTING =====

/**
 * Format transaction response data
 */
export function formatTransactionResponse(result: any, type: 'buy' | 'sell' | 'send') {
  const baseFormat = {
    transactionId: result.transaction_id,
    status: result.status,
    timestamp: result.timestamp
  }

  if (type === 'buy') {
    return {
      ...baseFormat,
      amountEur: parseFloat(result.amount_eur),
      aoaAmount: parseFloat(result.aoa_amount),
      feeAmount: parseFloat(result.fee_amount),
      exchangeRate: parseFloat(result.exchange_rate)
    }
  }

  if (type === 'sell') {
    return {
      ...baseFormat,
      amountAoa: parseFloat(result.amount_aoa),
      eurAmount: parseFloat(result.eur_amount),
      feeAmount: parseFloat(result.fee_amount),
      exchangeRate: parseFloat(result.exchange_rate)
    }
  }

  if (type === 'send') {
    return {
      ...baseFormat,
      amount: parseFloat(result.amount),
      currency: result.currency,
      netAmount: parseFloat(result.net_amount),
      feeAmount: parseFloat(result.fee_amount),
      recipient: result.recipient
    }
  }

  return baseFormat
}

/**
 * Format sell offer response data
 */
export function formatSellOfferResponse(offerDetails: any, rateValidation: any) {
  return {
    offer_id: offerDetails.id,
    user_id: offerDetails.user_id,
    currency: offerDetails.currency_type,
    amount: parseFloat(offerDetails.reserved_amount.toString()),
    exchange_rate: parseFloat(offerDetails.exchange_rate.toString()),
    status: offerDetails.status,
    created_at: offerDetails.created_at,
    validation_info: {
      source: rateValidation.source,
      market_rate: rateValidation.marketRate,
      allowed_range: rateValidation.allowedRange
    }
  }
}
