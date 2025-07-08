import { NextRequest, NextResponse } from 'next/server'
import { VWAPService } from '@/lib/vwap-service'
import { getAuthenticatedUser } from '@/lib/api-utils'

/**
 * GET /api/exchange/dynamic-rates
 * Get current dynamic exchange rates with VWAP calculation
 * 
 * Query parameters:
 * - currency: 'EUR' | 'AOA' (required)
 * - includeDetails: boolean (optional) - include calculation details
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    await getAuthenticatedUser()

    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') as 'EUR' | 'AOA'
    const includeDetails = searchParams.get('includeDetails') === 'true'

    if (!currency || !['EUR', 'AOA'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Valid currency parameter required (EUR or AOA)' },
        { status: 400 }
      )
    }

    // Get dynamic exchange rate
    const rateInfo = await VWAPService.getDynamicExchangeRate(currency)

    // Get additional details if requested
    let details = null
    if (includeDetails) {
      const currencyPair = currency === 'EUR' ? 'EUR_AOA' : 'AOA_EUR'
      const latestRate = await VWAPService.getLatestDynamicRate(currencyPair)
      
      details = {
        currency_pair: currencyPair,
        last_calculation: latestRate?.calculated_at || null,
        transaction_count: latestRate?.transaction_count || 0,
        total_volume: latestRate?.total_volume || 0,
        is_stale: rateInfo.isStale || false
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        currency,
        rate: rateInfo.rate,
        source: rateInfo.source,
        last_updated: rateInfo.lastUpdated.toISOString(),
        formatted_rate: VWAPService.formatRateForDisplay(rateInfo.rate, currency),
        is_stale: rateInfo.isStale || false,
        ...(details && { details })
      }
    })

  } catch (error) {
    console.error('Error getting dynamic exchange rates:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get dynamic exchange rates'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/exchange/dynamic-rates/refresh
 * Manually refresh VWAP rates (admin function)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await getAuthenticatedUser()

    // Refresh all VWAP rates
    const refreshResult = await VWAPService.refreshAllVWAPRates()

    if (!refreshResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to refresh VWAP rates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'VWAP rates refreshed successfully',
        results: refreshResult.results
      }
    })

  } catch (error) {
    console.error('Error refreshing VWAP rates:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh VWAP rates'
      },
      { status: 500 }
    )
  }
}
