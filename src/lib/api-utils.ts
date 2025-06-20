import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/supabase-server'

// ===== STANDARD API RESPONSE TYPES =====

export interface ApiSuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
  timestamp: string
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// ===== API RESPONSE BUILDERS =====

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
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
  details?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

// ===== AUTHENTICATION UTILITIES =====

/**
 * Get authenticated user with standardized error handling
 */
export async function getAuthenticatedUser() {
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

// ===== VALIDATION UTILITIES =====

/**
 * Validate amount input
 */
export function validateAmount(amount: any, fieldName = 'amount'): number {
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new ApiError(`Invalid ${fieldName}. Must be a positive number.`, 400)
  }
  return Number(amount)
}

/**
 * Validate currency input
 */
export function validateCurrency(currency: any): 'EUR' | 'AOA' {
  if (!currency || !['EUR', 'AOA'].includes(currency)) {
    throw new ApiError('Invalid currency. Must be EUR or AOA', 400)
  }
  return currency as 'EUR' | 'AOA'
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
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.status, error.details)
  }

  if (error instanceof Error) {
    return createErrorResponse(
      'Erro interno do servidor',
      500,
      error.message
    )
  }

  return createErrorResponse(
    'Erro interno do servidor',
    500,
    'Unknown error'
  )
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
