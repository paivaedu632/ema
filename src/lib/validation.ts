import { z } from 'zod'
import { NextRequest } from 'next/server'

// ===== BASIC VALIDATION SCHEMAS =====

/**
 * Currency validation schema
 */
export const CurrencySchema = z.enum(['EUR', 'AOA'], {
  errorMap: () => ({ message: 'Moeda deve ser "EUR" ou "AOA"' })
})

/**
 * Positive number validation schema
 */
export const PositiveNumberSchema = z.number().positive({
  message: 'Valor deve ser um número positivo'
})

/**
 * Create amount validation schema with currency-specific limits
 */
export const createAmountSchema = (currency: 'EUR' | 'AOA') => {
  const limits = {
    EUR: { min: 0.01, max: 50000 },
    AOA: { min: 1, max: 20000000 }
  }
  
  return z.number()
    .min(limits[currency].min, `Valor mínimo para ${currency}: ${limits[currency].min}`)
    .max(limits[currency].max, `Valor máximo para ${currency}: ${limits[currency].max}`)
}

/**
 * String to number conversion schema
 */
export const StringToNumberSchema = z.string()
  .transform((val) => {
    const num = parseFloat(val)
    if (isNaN(num)) {
      throw new Error('Valor deve ser um número válido')
    }
    return num
  })
  .pipe(PositiveNumberSchema)

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid({
  message: 'ID deve ser um UUID válido'
})

/**
 * Email validation schema
 */
export const EmailSchema = z.string()
  .email({ message: 'Email deve ter um formato válido' })
  .min(1, { message: 'Email é obrigatório' })

// ===== ORDER VALIDATION SCHEMAS (for testing) =====

/**
 * Order side validation schema
 */
export const OrderSideSchema = z.enum(['buy', 'sell'], {
  errorMap: () => ({ message: 'Lado da ordem deve ser "buy" ou "sell"' })
})

/**
 * Order type validation schema
 */
export const OrderTypeSchema = z.enum(['limit', 'market'], {
  errorMap: () => ({ message: 'Tipo de ordem deve ser "limit" ou "market"' })
})

/**
 * Order placement validation schema (for testing purposes)
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
  message: 'Base and quote currencies must be different',
  path: ['quote_currency']
}).refine((data) => {
  // Price required for limit orders
  if (data.type === 'limit' && !data.price) {
    return false
  }
  return true
}, {
  message: 'Price is required for limit orders',
  path: ['price']
})

// ===== PAGINATION VALIDATION SCHEMAS =====

/**
 * Pagination query validation schema
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

// ===== VALIDATION UTILITIES =====

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      throw new Error(`Validation error: ${errorMessage}`)
    }
    throw new Error('Invalid JSON in request body')
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
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      throw new Error(`Query validation error: ${errorMessage}`)
    }
    throw new Error('Invalid query parameters')
  }
}

/**
 * Safe validation that returns result with success/error
 */
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      return { success: false, error: errorMessage }
    }
    return { success: false, error: 'Validation failed' }
  }
}
