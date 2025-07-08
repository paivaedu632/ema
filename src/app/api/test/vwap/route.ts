import { NextRequest, NextResponse } from 'next/server'
import { VWAPService } from '@/lib/vwap-service'

/**
 * GET /api/test/vwap
 * Test endpoint for VWAP functionality
 * This endpoint is for development/testing purposes only
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'rates'

    switch (action) {
      case 'rates':
        // Test getting dynamic rates for both currencies
        const eurRate = await VWAPService.getDynamicExchangeRate('EUR')
        const aoaRate = await VWAPService.getDynamicExchangeRate('AOA')

        return NextResponse.json({
          success: true,
          data: {
            EUR: {
              rate: eurRate.rate,
              source: eurRate.source,
              lastUpdated: eurRate.lastUpdated,
              formatted: VWAPService.formatRateForDisplay(eurRate.rate, 'EUR'),
              isStale: eurRate.isStale
            },
            AOA: {
              rate: aoaRate.rate,
              source: aoaRate.source,
              lastUpdated: aoaRate.lastUpdated,
              formatted: VWAPService.formatRateForDisplay(aoaRate.rate, 'AOA'),
              isStale: aoaRate.isStale
            }
          }
        })

      case 'vwap':
        // Test VWAP calculation for both currency pairs
        const eurAoaVwap = await VWAPService.calculateVWAPRate('EUR_AOA')
        const aoaEurVwap = await VWAPService.calculateVWAPRate('AOA_EUR')

        return NextResponse.json({
          success: true,
          data: {
            EUR_AOA: eurAoaVwap,
            AOA_EUR: aoaEurVwap
          }
        })

      case 'refresh':
        // Test refreshing all VWAP rates
        const refreshResult = await VWAPService.refreshAllVWAPRates()

        return NextResponse.json({
          success: refreshResult.success,
          data: refreshResult.results
        })

      case 'stored':
        // Test getting stored dynamic rates
        const storedRates = await VWAPService.getStoredDynamicRates()

        return NextResponse.json({
          success: true,
          data: storedRates
        })

      case 'validate':
        // Test rate validation
        const testRate = parseFloat(searchParams.get('rate') || '900')
        const currency = (searchParams.get('currency') || 'EUR') as 'EUR' | 'AOA'
        
        const validation = await VWAPService.validateUserRate(currency, testRate)

        return NextResponse.json({
          success: true,
          data: {
            testRate,
            currency,
            validation
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available actions: rates, vwap, refresh, stored, validate'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in VWAP test endpoint:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
