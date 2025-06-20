import { NextResponse } from 'next/server'

// Banco BAI API configuration
const BANCO_BAI_API = {
  BASE_URL: process.env.BANCO_BAI_API_URL || 'https://ib.bancobai.ao/portal/api/internet/exchange/table',
  CURRENCY: 'AKZ', // Angola Kwanza (same as AOA)
  APP_VERSION: 'v1.11.04'
} as const

interface BancoBaiApiResponse {
  sellValue: number
  buyValue: number
  currency: string
  quotationDate: string
}

/**
 * GET /api/exchange-rate/banco-bai
 * Fetch current EUR/AOA exchange rate from Banco BAI API
 */
export async function GET() {
  try {
    const currentDate = new Date().toISOString()
    const noCacheHelper = Date.now()
    
    const url = new URL(BANCO_BAI_API.BASE_URL)
    url.searchParams.set('currency', BANCO_BAI_API.CURRENCY)
    url.searchParams.set('quotationDate', currentDate)
    url.searchParams.set('noCacheHelper', noCacheHelper.toString())
    url.searchParams.set('appVersion', BANCO_BAI_API.APP_VERSION)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EmaPay/1.0'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    })

    if (!response.ok) {
      console.error('Banco BAI API error:', response.status, response.statusText)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch exchange rate from Banco BAI API',
          status: response.status 
        },
        { status: 503 }
      )
    }

    const data = await response.json()

    // Handle Banco BAI API response structure
    let eurRate: any = null

    if (data && data.data && data.data.exchangeTableEntryViewList) {
      // Find EUR exchange rate in the exchangeTableEntryViewList
      // Prefer type 1 (standard rate) over type 2 (premium rate)
      const eurRates = data.data.exchangeTableEntryViewList.filter((rate: any) => rate.currency === 'EUR')

      if (eurRates.length > 0) {
        // Prefer type 1 if available, otherwise use the first one
        eurRate = eurRates.find((rate: any) => rate.type === 1) || eurRates[0]
      }
    }

    if (!eurRate) {
      console.error('EUR rate not found in Banco BAI API response')
      return NextResponse.json(
        {
          success: false,
          error: 'EUR exchange rate not found in API response'
        },
        { status: 404 }
      )
    }

    const result: BancoBaiApiResponse = {
      sellValue: parseFloat(eurRate.sellValue),
      buyValue: parseFloat(eurRate.buyValue),
      currency: eurRate.currency,
      quotationDate: eurRate.quotationDate
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching Banco BAI exchange rate:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching exchange rate',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
