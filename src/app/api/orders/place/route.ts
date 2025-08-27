// Order Placement API Endpoint
// POST /api/orders/place - Place a new order (limit or market)

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse, createCreatedResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { validateRequestBody, PlaceOrderSchema } from '@/lib/validation'
import { OrderBookFunctions } from '@/lib/supabase-server'
import { createUserContext, hassufficientBalance } from '@/middleware/user-context'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'
import { formatAmountWithCurrency, type Currency } from '@/lib/format'

/**
 * POST /api/orders/place
 * Place a new order in the order book
 * 
 * Request Body:
 * {
 *   "side": "sell",
 *   "type": "limit" | "market",
 *   "base_currency": "EUR" | "AOA",
 *   "quote_currency": "EUR" | "AOA",
 *   "quantity": number,
 *   "price": number (required for limit orders),
 *   "dynamic_pricing_enabled": boolean (optional, only for limit sell orders)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "order_id": string,
 *     "status": "pending" | "filled" | "partially_filled",
 *     "reserved_amount": number,
 *     "created_at": string,
 *     "message": string,
 *     "dynamic_pricing_info": object (if dynamic pricing enabled)
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Validate request body
    const orderData = await validateRequestBody(request, PlaceOrderSchema)

    // 3. Create user context with wallet information
    const userContext = await createUserContext(authContext)

    // 4. Validate business rules
    await validateOrderPlacement(userContext, orderData)

    // 5. Calculate required funds
    const requiredFunds = calculateRequiredFunds(orderData)

    // 6. Check sufficient balance
    const currency = orderData.side === 'buy' ? orderData.quote_currency : orderData.base_currency
    if (!hassufficientBalance(userContext, currency, requiredFunds)) {
      throw createApiError(
        `Saldo insuficiente. Necessário: ${formatAmountWithCurrency(requiredFunds, currency as Currency)}`,
        400,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.LOW
      )
    }

    // 7. Place order using database function with dynamic pricing support
    const orderResult = await OrderBookFunctions.placeOrder({
      p_user_id: user.id,
      p_order_type: orderData.type,
      p_side: orderData.side,
      p_base_currency: orderData.base_currency,
      p_quote_currency: orderData.quote_currency,
      p_quantity: orderData.quantity,
      p_price: orderData.price,
      p_dynamic_pricing_enabled: orderData.dynamic_pricing_enabled || false
    })

    // 8. Return success response with dynamic pricing info
    const responseData: any = {
      order_id: orderResult.order_id,
      status: orderResult.status,
      reserved_amount: orderResult.reserved_amount,
      created_at: orderResult.created_at,
      message: orderResult.message || getOrderSuccessMessage(orderData, orderResult)
    }

    // Include dynamic pricing info if enabled
    if (orderData.dynamic_pricing_enabled && orderResult.dynamic_pricing_info) {
      responseData.dynamic_pricing_info = orderResult.dynamic_pricing_info
    }

    return createCreatedResponse(responseData, 'Ordem criada com sucesso')

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'POST /api/orders/place',
      userId: request.headers.get('x-user-id') // For logging
    })
  }
}

/**
 * Validate order placement business rules
 */
async function validateOrderPlacement(userContext: any, orderData: any) {
  // 1. Validate KYC status (based on user preferences - temporarily disabled)
  // if (!userContext.kycCompleted) {
  //   throw createApiError(
  //     'KYC aprovado é necessário para realizar ordens',
  //     403,
  //     ErrorCategory.AUTHORIZATION,
  //     ErrorSeverity.MEDIUM
  //   )
  // }

  // 2. Validate currency pair
  if (orderData.base_currency === orderData.quote_currency) {
    throw createApiError(
      'Moedas base e cotação devem ser diferentes',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 3. Validate supported currency pairs
  const supportedPairs = [
    { base: 'EUR', quote: 'AOA' },
    { base: 'AOA', quote: 'EUR' }
  ]
  
  const isValidPair = supportedPairs.some(pair => 
    pair.base === orderData.base_currency && pair.quote === orderData.quote_currency
  )
  
  if (!isValidPair) {
    throw createApiError(
      'Par de moedas não suportado. Pares disponíveis: EUR/AOA, AOA/EUR',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 4. Validate price for limit orders
  if (orderData.type === 'limit' && !orderData.price) {
    throw createApiError(
      'Preço é obrigatório para ordens limitadas',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 5. Validate price range (basic sanity check)
  if (orderData.price && orderData.price <= 0) {
    throw createApiError(
      'Preço deve ser maior que zero',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 6. Validate quantity
  if (orderData.quantity <= 0) {
    throw createApiError(
      'Quantidade deve ser maior que zero',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 7. Validate minimum order size
  const minOrderSize = getMinimumOrderSize(orderData.base_currency)
  if (orderData.quantity < minOrderSize) {
    throw createApiError(
      `Quantidade mínima: ${minOrderSize} ${orderData.base_currency}`,
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 8. Validate dynamic pricing rules
  if (orderData.dynamic_pricing_enabled) {
    if (orderData.type !== 'limit') {
      throw createApiError(
        'Preços dinâmicos só se aplicam a ordens limitadas',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (orderData.side !== 'sell') {
      throw createApiError(
        'Preços dinâmicos só se aplicam a ordens de venda',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }
  }
}

/**
 * Calculate required funds for order
 */
function calculateRequiredFunds(orderData: any): number {
  if (orderData.side === 'buy') {
    // For buy orders, need quote currency
    if (orderData.type === 'market') {
      // For market orders, estimate based on quantity
      // This is a simplified calculation - in production, you'd get current market price
      const estimatedPrice = 1200 // Default AOA per EUR estimate
      return orderData.quantity * estimatedPrice
    } else {
      // For limit orders, use specified price
      return orderData.quantity * orderData.price
    }
  } else {
    // For sell orders, need base currency
    return orderData.quantity
  }
}

/**
 * Get minimum order size for currency
 */
function getMinimumOrderSize(currency: 'EUR' | 'AOA'): number {
  const minimums = {
    EUR: 1,      // 1 EUR minimum
    AOA: 1000    // 1000 AOA minimum
  }
  
  return minimums[currency]
}

/**
 * Generate success message based on order type and result
 */
function getOrderSuccessMessage(orderData: any, orderResult: any): string {
  const orderType = orderData.type === 'limit' ? 'limitada' : 'de mercado'
  const side = orderData.side === 'buy' ? 'compra' : 'venda'
  
  if (orderResult.status === 'filled') {
    return `Ordem ${orderType} de ${side} executada completamente`
  } else if (orderResult.status === 'partially_filled') {
    return `Ordem ${orderType} de ${side} executada parcialmente`
  } else {
    return `Ordem ${orderType} de ${side} criada e aguardando execução`
  }
}
