// Dynamic Pricing Management API Endpoint
// PUT /api/orders/[orderId]/dynamic-pricing - Toggle dynamic pricing for an order
// GET /api/orders/[orderId]/dynamic-pricing - Get dynamic pricing status and info

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { validateRequestBody, ToggleDynamicPricingSchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * PUT /api/orders/[orderId]/dynamic-pricing
 * Toggle dynamic pricing for a specific order
 * 
 * Request Body:
 * {
 *   "enabled": boolean
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "order_id": string,
 *     "dynamic_pricing_enabled": boolean,
 *     "current_price": number,
 *     "original_price": number,
 *     "message": string
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Validate request body
    const body = await request.json()
    const validatedData = ToggleDynamicPricingSchema.parse({
      order_id: params.orderId,
      enabled: body.enabled
    })

    // 3. Call database function to toggle dynamic pricing
    const { data: result, error } = await supabaseAdmin.rpc('toggle_dynamic_pricing', {
      p_order_id: validatedData.order_id,
      p_user_id: user.id,
      p_enable: validatedData.enabled
    })

    if (error) {
      throw createApiError(
        `Erro ao alterar preços dinâmicos: ${error.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    if (!result || result.length === 0) {
      throw createApiError(
        'Ordem não encontrada ou não elegível para preços dinâmicos',
        404,
        ErrorCategory.NOT_FOUND,
        ErrorSeverity.MEDIUM
      )
    }

    const toggleResult = result[0]

    if (!toggleResult.success) {
      throw createApiError(
        toggleResult.message || 'Falha ao alterar preços dinâmicos',
        400,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.MEDIUM
      )
    }

    // 4. Return success response
    return createSuccessResponse(
      {
        order_id: validatedData.order_id,
        dynamic_pricing_enabled: validatedData.enabled,
        current_price: toggleResult.current_price,
        original_price: toggleResult.original_price,
        message: toggleResult.message
      },
      'Configuração de preços dinâmicos atualizada com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: `PUT /api/orders/${params.orderId}/dynamic-pricing`,
      userId: request.headers.get('x-user-id')
    })
  }
}

/**
 * GET /api/orders/[orderId]/dynamic-pricing
 * Get dynamic pricing status and configuration for an order
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "order_id": string,
 *     "dynamic_pricing_enabled": boolean,
 *     "current_price": number,
 *     "original_price": number,
 *     "last_price_update": string,
 *     "price_update_count": number,
 *     "min_price_bound": number,
 *     "max_price_bound": number,
 *     "next_update_eligible": string,
 *     "vwap_info": object
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Get order details with dynamic pricing info
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('order_book')
      .select(`
        id,
        user_id,
        side,
        type,
        base_currency,
        quote_currency,
        quantity,
        remaining_quantity,
        price,
        original_price,
        dynamic_pricing_enabled,
        last_price_update,
        price_update_count,
        min_price_bound,
        max_price_bound,
        status,
        created_at
      `)
      .eq('id', params.orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !orderData) {
      throw createApiError(
        'Ordem não encontrada',
        404,
        ErrorCategory.NOT_FOUND,
        ErrorSeverity.MEDIUM
      )
    }

    // 3. Get VWAP information if dynamic pricing is enabled
    let vwapInfo = null
    if (orderData.dynamic_pricing_enabled) {
      const { data: vwapData, error: vwapError } = await supabaseAdmin.rpc('calculate_vwap', {
        p_base_currency: orderData.base_currency,
        p_quote_currency: orderData.quote_currency,
        p_hours: 12
      })

      if (!vwapError && vwapData && vwapData.length > 0) {
        vwapInfo = vwapData[0]
      }
    }

    // 4. Calculate next update eligibility
    let nextUpdateEligible = null
    if (orderData.dynamic_pricing_enabled && orderData.last_price_update) {
      const lastUpdate = new Date(orderData.last_price_update)
      const nextUpdate = new Date(lastUpdate.getTime() + 5 * 60 * 1000) // 5 minutes
      nextUpdateEligible = nextUpdate.toISOString()
    }

    // 5. Return order dynamic pricing info
    return createSuccessResponse(
      {
        order_id: orderData.id,
        dynamic_pricing_enabled: orderData.dynamic_pricing_enabled,
        current_price: orderData.price,
        original_price: orderData.original_price,
        last_price_update: orderData.last_price_update,
        price_update_count: orderData.price_update_count,
        min_price_bound: orderData.min_price_bound,
        max_price_bound: orderData.max_price_bound,
        next_update_eligible: nextUpdateEligible,
        vwap_info: vwapInfo,
        order_status: orderData.status,
        order_type: orderData.type,
        order_side: orderData.side
      },
      'Informações de preços dinâmicos recuperadas com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: `GET /api/orders/${params.orderId}/dynamic-pricing`,
      userId: request.headers.get('x-user-id')
    })
  }
}
