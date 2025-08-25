// Test Order Placement API Endpoint (No Authentication Required)
// POST /api/test-public/orders/place - Place test orders for trading system validation

import { NextRequest } from 'next/server'
import { createSuccessResponse, createCreatedResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validateRequestBody, PlaceOrderSchema } from '@/lib/validation'
import { OrderBookFunctions } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * Test user IDs for testing purposes (valid UUIDs)
 */
const TEST_USERS = {
  TRADER_1: '11111111-1111-1111-1111-111111111111',
  TRADER_2: '22222222-2222-2222-2222-222222222222',
  TRADER_3: '33333333-3333-3333-3333-333333333333'
}

/**
 * POST /api/test-public/orders/place
 * Place a test order without authentication (for testing only)
 * 
 * Request Body:
 * {
 *   "test_user": "TRADER_1" | "TRADER_2" | "TRADER_3",
 *   "side": "buy" | "sell",
 *   "type": "limit" | "market",
 *   "base_currency": "EUR" | "AOA",
 *   "quote_currency": "EUR" | "AOA",
 *   "quantity": number,
 *   "price": number (required for limit orders)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      throw createApiError(
        'Test endpoints not available in production',
        403,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.HIGH
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Extract test user
    const testUser = body.test_user || 'TRADER_1'
    const userId = TEST_USERS[testUser as keyof typeof TEST_USERS] || TEST_USERS.TRADER_1
    
    // Validate order data (excluding test_user field)
    const { test_user, ...orderData } = body
    const validatedOrder = PlaceOrderSchema.parse(orderData)

    // Validate business rules
    await validateTestOrderPlacement(validatedOrder)

    // Place order using database function
    const orderResult = await OrderBookFunctions.placeOrder({
      p_user_id: userId,
      p_order_type: validatedOrder.type,
      p_side: validatedOrder.side,
      p_base_currency: validatedOrder.base_currency,
      p_quote_currency: validatedOrder.quote_currency,
      p_quantity: validatedOrder.quantity,
      p_price: validatedOrder.price
    })

    // Return success response
    return createCreatedResponse(
      {
        order_id: orderResult.order_id,
        status: orderResult.status,
        reserved_amount: orderResult.reserved_amount,
        created_at: orderResult.created_at,
        test_user: testUser,
        message: orderResult.message || getOrderSuccessMessage(validatedOrder, orderResult)
      },
      'Test order created successfully'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'POST /api/test-public/orders/place'
    })
  }
}

/**
 * Validate test order placement business rules
 */
async function validateTestOrderPlacement(orderData: any) {
  // 1. Validate currency pair
  if (orderData.base_currency === orderData.quote_currency) {
    throw createApiError(
      'Base and quote currencies must be different',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 2. Validate supported currency pairs
  const supportedPairs = [
    { base: 'EUR', quote: 'AOA' },
    { base: 'AOA', quote: 'EUR' }
  ]
  
  const isValidPair = supportedPairs.some(pair => 
    pair.base === orderData.base_currency && pair.quote === orderData.quote_currency
  )
  
  if (!isValidPair) {
    throw createApiError(
      'Unsupported currency pair. Available pairs: EUR/AOA, AOA/EUR',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 3. Validate price for limit orders
  if (orderData.type === 'limit' && !orderData.price) {
    throw createApiError(
      'Price is required for limit orders',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 4. Validate price range (basic sanity check)
  if (orderData.price && orderData.price <= 0) {
    throw createApiError(
      'Price must be greater than zero',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 5. Validate quantity
  if (orderData.quantity <= 0) {
    throw createApiError(
      'Quantity must be greater than zero',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 6. Validate minimum order size
  const minOrderSize = getMinimumOrderSize(orderData.base_currency)
  if (orderData.quantity < minOrderSize) {
    throw createApiError(
      `Minimum quantity: ${minOrderSize} ${orderData.base_currency}`,
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW
    )
  }

  // 7. Validate reasonable price ranges for testing
  if (orderData.price) {
    const priceRanges = {
      'EUR-AOA': { min: 800, max: 2000 },   // AOA per EUR
      'AOA-EUR': { min: 0.0005, max: 0.00125 } // EUR per AOA
    }
    
    const pairKey = `${orderData.base_currency}-${orderData.quote_currency}` as keyof typeof priceRanges
    const range = priceRanges[pairKey]
    
    if (range && (orderData.price < range.min || orderData.price > range.max)) {
      throw createApiError(
        `Price should be between ${range.min} and ${range.max} for ${pairKey}`,
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }
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
  const orderType = orderData.type === 'limit' ? 'limit' : 'market'
  const side = orderData.side
  
  if (orderResult.status === 'filled') {
    return `${orderType} ${side} order executed completely`
  } else if (orderResult.status === 'partially_filled') {
    return `${orderType} ${side} order executed partially`
  } else {
    return `${orderType} ${side} order created and pending execution`
  }
}
