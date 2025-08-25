// EmaPay API Validation Utilities
// Comprehensive Zod schema validation for API endpoints

import { z } from 'zod'
import { TRANSACTION_LIMITS, VALIDATION_MESSAGES } from '@/utils/transaction-validation'
import { ApiError } from '@/lib/api-utils'

// ===== COMMON VALIDATION SCHEMAS =====

/**
 * Currency validation schema
 */
export const CurrencySchema = z.enum(['EUR', 'AOA'], {
  errorMap: () => ({ message: VALIDATION_MESSAGES.CURRENCY.INVALID })
})

/**
 * Positive number validation with custom error
 */
export const PositiveNumberSchema = z.number().positive({
  message: 'Deve ser um número positivo'
})

/**
 * Amount validation schema with currency-specific limits
 */
export const createAmountSchema = (currency: 'EUR' | 'AOA') => {
  const limits = TRANSACTION_LIMITS[currency]
  return z.number()
    .positive({ message: VALIDATION_MESSAGES.AMOUNT.INVALID })
    .min(limits.min, { message: VALIDATION_MESSAGES.AMOUNT.MIN(limits.min, currency) })
    .max(limits.max, { message: VALIDATION_MESSAGES.AMOUNT.MAX(limits.max, currency) })
}

/**
 * String to number transformation with validation
 */
export const StringToNumberSchema = z.string()
  .min(1, 'Campo obrigatório')
  .transform((val) => {
    const num = Number(val)
    if (isNaN(num)) {
      throw new z.ZodError([{
        code: 'custom',
        message: 'Deve ser um número válido',
        path: []
      }])
    }
    return num
  })

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid({
  message: 'ID inválido'
})

/**
 * Email validation schema
 */
export const EmailSchema = z.string()
  .email({ message: 'Email inválido' })
  .min(1, 'Email é obrigatório')

// ===== ORDER BOOK VALIDATION SCHEMAS =====

/**
 * Order side validation
 */
export const OrderSideSchema = z.enum(['buy', 'sell'], {
  errorMap: () => ({ message: 'Lado da ordem deve ser "buy" ou "sell"' })
})

/**
 * Order type validation
 */
export const OrderTypeSchema = z.enum(['limit', 'market'], {
  errorMap: () => ({ message: 'Tipo de ordem deve ser "limit" ou "market"' })
})

/**
 * Order placement validation schema with dynamic pricing support
 */
export const PlaceOrderSchema = z.object({
  side: OrderSideSchema,
  type: OrderTypeSchema,
  base_currency: CurrencySchema,
  quote_currency: CurrencySchema,
  quantity: PositiveNumberSchema,
  price: PositiveNumberSchema.optional(),
  dynamic_pricing_enabled: z.boolean().optional().default(false)
}).refine((data) => {
  // Ensure currencies are different
  if (data.base_currency === data.quote_currency) {
    return false
  }
  return true
}, {
  message: 'Moedas base e cotação devem ser diferentes',
  path: ['quote_currency']
}).refine((data) => {
  // Price required for limit orders
  if (data.type === 'limit' && !data.price) {
    return false
  }
  return true
}, {
  message: 'Preço é obrigatório para ordens limitadas',
  path: ['price']
}).refine((data) => {
  // Dynamic pricing only for limit sell orders
  if (data.dynamic_pricing_enabled && (data.type !== 'limit' || data.side !== 'sell')) {
    return false
  }
  return true
}, {
  message: 'Preços dinâmicos só se aplicam a ordens de venda limitadas',
  path: ['dynamic_pricing_enabled']
})

/**
 * Order cancellation validation schema
 */
export const CancelOrderSchema = z.object({
  order_id: UUIDSchema
})

/**
 * Dynamic pricing toggle validation schema
 */
export const ToggleDynamicPricingSchema = z.object({
  order_id: UUIDSchema,
  enabled: z.boolean()
})

/**
 * Price history query validation schema
 */
export const PriceHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
})

/**
 * Currency pair validation schema
 */
export const CurrencyPairSchema = z.enum(['EUR-AOA', 'AOA-EUR'], {
  errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
})

/**
 * VWAP calculation query validation schema
 */
export const VWAPQuerySchema = z.object({
  pair: CurrencyPairSchema,
  hours: z.coerce.number().int().min(1).max(168).default(12) // 1 hour to 1 week
})

/**
 * Order query parameters validation schema
 */
export const OrderQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['pending', 'filled', 'partially_filled', 'cancelled']).optional(),
  currency_pair: z.enum(['EUR/AOA', 'AOA/EUR']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
})

// ===== MARKET DATA VALIDATION SCHEMAS =====

/**
 * Market data query validation schema
 */
export const MarketDataQuerySchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).optional()
})

/**
 * Order book depth query validation schema
 */
export const OrderBookDepthQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  aggregate: z.coerce.boolean().default(true)
})

/**
 * Recent trades query validation schema
 */
export const RecentTradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
})

/**
 * Market statistics query validation schema
 */
export const MarketStatsQuerySchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']).default('24h')
})

/**
 * WebSocket subscription validation schema
 */
export const WebSocketSubscriptionSchema = z.object({
  action: z.enum(['subscribe', 'unsubscribe']),
  pair: CurrencyPairSchema,
  channels: z.array(z.enum(['ticker', 'orderbook', 'trades', 'stats'])).min(1)
})

/**
 * Market depth query validation schema
 */
export const MarketDepthQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
})

/**
 * Trade history query validation schema
 */
export const TradeHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
})

// ===== WALLET VALIDATION SCHEMAS =====

/**
 * Transaction type validation
 */
export const TransactionTypeSchema = z.enum([
  'buy', 'sell', 'send', 'deposit', 'withdraw', 'exchange_buy', 'exchange_sell'
], {
  errorMap: () => ({ message: 'Tipo de transação inválido' })
})

/**
 * Send transaction validation schema
 */
export const SendTransactionSchema = z.object({
  amount: PositiveNumberSchema,
  currency: CurrencySchema,
  recipient: z.object({
    name: z.string().min(1, 'Nome do destinatário é obrigatório'),
    email: EmailSchema
  }),
  description: z.string().optional()
})

// ===== PAGINATION VALIDATION SCHEMAS =====

/**
 * Pagination query validation schema
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
})

// ===== VALIDATION UTILITIES =====

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiError(
        firstError.message,
        400,
        `Validation failed for field: ${firstError.path.join('.')}`
      )
    }
    throw new ApiError('Invalid JSON in request body', 400)
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(searchParams.entries())
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiError(
        firstError.message,
        400,
        `Invalid query parameter: ${firstError.path.join('.')}`
      )
    }
    throw new ApiError('Invalid query parameters', 400)
  }
}

/**
 * Validate path parameters with Zod schema
 */
export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiError(
        firstError.message,
        400,
        `Invalid path parameter: ${firstError.path.join('.')}`
      )
    }
    throw new ApiError('Invalid path parameters', 400)
  }
}

/**
 * Create validation error response from Zod error
 */
export function createValidationErrorResponse(error: z.ZodError) {
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }))

  return {
    success: false,
    error: 'Validation failed',
    details: errors,
    timestamp: new Date().toISOString()
  }
}

/**
 * Safe validation that returns result instead of throwing
 */
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error }
    }
    throw error
  }
}
