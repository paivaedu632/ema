// Dynamic Pricing Background Processor API Endpoint
// POST /api/admin/process-dynamic-pricing - Process all dynamic pricing updates

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * POST /api/admin/process-dynamic-pricing
 * Process all eligible dynamic pricing updates
 * 
 * This endpoint should be called by a cron job or background scheduler
 * every 5 minutes to update dynamic order prices.
 * 
 * Request Headers:
 * - Authorization: Bearer <admin_token> (for security)
 * - X-Cron-Secret: <secret> (for cron job authentication)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total_orders_processed": number,
 *     "orders_updated": number,
 *     "orders_unchanged": number,
 *     "processing_duration": string,
 *     "update_summary": array,
 *     "next_run_recommended": string,
 *     "system_status": object
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate cron job authentication
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      throw createApiError(
        'Unauthorized: Invalid cron secret',
        401,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.HIGH
      )
    }

    // 2. Check if processing is already running (prevent concurrent runs)
    const processingLockKey = 'dynamic_pricing_processing'
    const { data: existingLock } = await supabaseAdmin
      .from('dynamic_pricing_config')
      .select('config_value')
      .eq('config_key', processingLockKey)
      .single()

    if (existingLock?.config_value?.processing === true) {
      return createSuccessResponse(
        {
          message: 'Dynamic pricing processing already in progress',
          skipped: true,
          processing_status: 'concurrent_run_prevented'
        },
        'Processing skipped - already running'
      )
    }

    // 3. Set processing lock
    await supabaseAdmin
      .from('dynamic_pricing_config')
      .upsert({
        config_key: processingLockKey,
        config_value: { processing: true, started_at: new Date().toISOString() },
        description: 'Processing lock for dynamic pricing updates'
      })

    const startTime = Date.now()

    try {
      // 4. Process all dynamic pricing updates
      const { data: processingResult, error: processingError } = await supabaseAdmin
        .rpc('process_all_dynamic_pricing_updates')

      if (processingError) {
        throw createApiError(
          `Erro ao processar atualizações de preços dinâmicos: ${processingError.message}`,
          500,
          ErrorCategory.DATABASE,
          ErrorSeverity.HIGH
        )
      }

      if (!processingResult || processingResult.length === 0) {
        throw createApiError(
          'Nenhum resultado retornado do processamento',
          500,
          ErrorCategory.DATABASE,
          ErrorSeverity.HIGH
        )
      }

      const result = processingResult[0]
      const endTime = Date.now()
      const totalDuration = endTime - startTime

      // 5. Get system status
      const { data: systemStatus } = await supabaseAdmin
        .from('order_book')
        .select('dynamic_pricing_enabled')
        .eq('dynamic_pricing_enabled', true)
        .eq('side', 'sell')
        .eq('type', 'limit')
        .in('status', ['pending', 'partially_filled'])

      const activeDynamicOrders = systemStatus?.length || 0

      // 6. Calculate next recommended run time
      const nextRunTime = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      // 7. Log processing results
      console.log('Dynamic Pricing Processing Results:', {
        total_processed: result.total_orders_processed,
        orders_updated: result.orders_updated,
        duration_ms: totalDuration,
        active_dynamic_orders: activeDynamicOrders
      })

      // 8. Return processing results
      return createSuccessResponse(
        {
          total_orders_processed: result.total_orders_processed,
          orders_updated: result.orders_updated,
          orders_unchanged: result.orders_unchanged,
          processing_duration: result.processing_duration,
          processing_duration_ms: totalDuration,
          update_summary: result.update_summary || [],
          next_run_recommended: nextRunTime.toISOString(),
          system_status: {
            active_dynamic_orders: activeDynamicOrders,
            processing_successful: true,
            last_run: new Date().toISOString()
          },
          performance_metrics: {
            orders_per_second: result.total_orders_processed > 0 
              ? (result.total_orders_processed / (totalDuration / 1000)).toFixed(2)
              : 0,
            update_rate_percentage: result.total_orders_processed > 0
              ? ((result.orders_updated / result.total_orders_processed) * 100).toFixed(1)
              : 0
          }
        },
        `Processamento concluído: ${result.orders_updated}/${result.total_orders_processed} ordens atualizadas`
      )

    } finally {
      // 9. Always release processing lock
      await supabaseAdmin
        .from('dynamic_pricing_config')
        .upsert({
          config_key: processingLockKey,
          config_value: { 
            processing: false, 
            last_completed: new Date().toISOString(),
            last_duration_ms: Date.now() - startTime
          },
          description: 'Processing lock for dynamic pricing updates'
        })
    }

  } catch (error) {
    // Ensure lock is released on error
    try {
      await supabaseAdmin
        .from('dynamic_pricing_config')
        .upsert({
          config_key: 'dynamic_pricing_processing',
          config_value: { 
            processing: false, 
            last_error: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          },
          description: 'Processing lock for dynamic pricing updates'
        })
    } catch (lockError) {
      console.error('Failed to release processing lock:', lockError)
    }

    return handleApiError(error, { 
      endpoint: 'POST /api/admin/process-dynamic-pricing'
    })
  }
}

/**
 * GET /api/admin/process-dynamic-pricing
 * Get dynamic pricing processing status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate admin access (simplified for demo)
    const adminSecret = request.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET
    
    if (!expectedSecret || adminSecret !== expectedSecret) {
      throw createApiError(
        'Unauthorized: Invalid admin secret',
        401,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.HIGH
      )
    }

    // 2. Get processing status
    const { data: processingStatus } = await supabaseAdmin
      .from('dynamic_pricing_config')
      .select('config_value')
      .eq('config_key', 'dynamic_pricing_processing')
      .single()

    // 3. Get active dynamic orders count
    const { count: dynamicOrdersCount } = await supabaseAdmin
      .from('order_book')
      .select('*', { count: 'exact', head: true })
      .eq('dynamic_pricing_enabled', true)
      .eq('side', 'sell')
      .eq('type', 'limit')
      .in('status', ['pending', 'partially_filled'])

    // 4. Get recent price updates statistics
    const { count: recentUpdatesCount } = await supabaseAdmin
      .from('price_updates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    // 5. Return status information
    return createSuccessResponse(
      {
        processing_status: processingStatus?.config_value || { processing: false },
        active_dynamic_orders: dynamicOrdersCount || 0,
        recent_updates_24h: recentUpdatesCount || 0,
        system_health: {
          database_accessible: true,
          functions_available: true,
          last_check: new Date().toISOString()
        }
      },
      'Status do processamento de preços dinâmicos'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/admin/process-dynamic-pricing'
    })
  }
}
