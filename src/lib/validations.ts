import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ===== VALIDATION UTILITIES =====

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return {
        success: false,
        error: `Validation error: ${errorMessage}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON in request body'
    };
  }
}

// ===== BASIC VALIDATION SCHEMAS =====

/**
 * Currency validation schema
 */
export const CurrencySchema = z.enum(['EUR', 'AOA'], {
  message: 'Moeda deve ser "EUR" ou "AOA"'
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
  message: 'Lado da ordem deve ser "buy" ou "sell"'
})

/**
 * Order type validation schema
 */
export const OrderTypeSchema = z.enum(['limit', 'market'], {
  message: 'Tipo de ordem deve ser "limit" ou "market"'
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

// ===== ADDITIONAL SCHEMAS FROM SCHEMAS.TS =====

// ===== ADDITIONAL SCHEMAS FROM SCHEMAS.TS =====

// Common validation patterns
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().min(10).max(15);
export const pinSchema = z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits');
export const amountSchema = z.number().positive().max(1000000);

// User search schema
export const userSearchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(['email', 'phone', 'name']).optional()
});

// Transfer schemas
export const transferSendSchema = z.object({
  recipientId: z.union([uuidSchema, emailSchema]), // Allow UUID or email
  amount: amountSchema,
  currency: CurrencySchema,
  pin: pinSchema,
  description: z.string().max(200).optional()
});

export const transferHistorySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  currency: CurrencySchema.optional()
});

// ===== MISSING SCHEMAS FOR API ROUTES =====

// Validation functions for search params and route params
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', ')
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid search parameters'
    };
  }
}

export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', ')
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid route parameters'
    };
  }
}

// Order schemas
export const limitOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive().max(1000000),
  price: z.number().positive(),
  baseCurrency: z.enum(['EUR', 'AOA']),
  quoteCurrency: z.enum(['EUR', 'AOA'])
});

export const marketOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive().max(1000000),
  baseCurrency: z.enum(['EUR', 'AOA']),
  quoteCurrency: z.enum(['EUR', 'AOA']),
  slippageLimit: z.number().min(0).max(0.1).default(0.05) // 5% default slippage
});

// Note: orderHistorySchema removed - endpoint removed for simplicity

// Security schemas
export const pinSetSchema = z.object({
  pin: pinSchema,
  confirmPin: pinSchema
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs must match",
  path: ["confirmPin"]
});

export const pinVerifySchema = z.object({
  pin: pinSchema
});

// Wallet schemas
export const walletCurrencySchema = z.object({
  currency: CurrencySchema
});
