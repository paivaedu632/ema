/**
 * Exchange Rate Validation Utilities for EmaPay P2P Exchange
 * 
 * Handles validation of exchange rates against existing market offers
 * and Banco BAI API baseline rates with proper margin calculations
 */

import { supabaseAdmin } from '@/lib/supabase-server'

// Exchange rate validation constants
export const MARKET_OFFERS_MARGIN = 0.20 // 20% margin for existing offers
export const API_BASELINE_MARGIN = 0.50 // 50% margin for API baseline
export const MARKET_OFFERS_WINDOW_HOURS = 24 // Consider offers from last 24 hours

// Banco BAI API configuration
export const BANCO_BAI_API = {
  BASE_URL: process.env.BANCO_BAI_API_URL || 'https://ib.bancobai.ao/portal/api/internet/exchange/table',
  CURRENCY: 'AKZ', // Angola Kwanza (same as AOA)
  APP_VERSION: 'v1.11.04'
} as const

export interface ExchangeRateValidationResult {
  isValid: boolean
  reason: string
  marketRate?: number
  proposedRate: number
  allowedRange?: {
    min: number
    max: number
  }
  source: 'market_offers' | 'banco_bai_api' | 'no_baseline'
}

export interface BancoBaiApiResponse {
  sellValue: number
  buyValue: number
  currency: string
  quotationDate: string
}

/**
 * Fetch current exchange rate from Banco BAI API
 */
export async function fetchBancoBaiExchangeRate(): Promise<BancoBaiApiResponse | null> {
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
      return null
    }

    const data = await response.json()
    
    // Find EUR exchange rate in the response
    const eurRate = data.find((rate: any) => rate.currency === 'EUR')
    
    if (!eurRate) {
      console.error('EUR rate not found in Banco BAI API response')
      return null
    }

    return {
      sellValue: parseFloat(eurRate.sellValue),
      buyValue: parseFloat(eurRate.buyValue),
      currency: eurRate.currency,
      quotationDate: eurRate.quotationDate
    }
  } catch (error) {
    console.error('Error fetching Banco BAI exchange rate:', error)
    return null
  }
}

/**
 * Get market rate from existing active offers
 */
export async function getMarketRateFromOffers(currencyType: 'AOA' | 'EUR'): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('offers')
      .select('exchange_rate')
      .eq('currency_type', currencyType)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - MARKET_OFFERS_WINDOW_HOURS * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error fetching market offers:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Calculate average exchange rate from active offers
    const rates = data.map(offer => parseFloat(offer.exchange_rate.toString()))
    const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length

    return averageRate
  } catch (error) {
    console.error('Error calculating market rate:', error)
    return null
  }
}

/**
 * Get baseline rate from Banco BAI API
 */
export async function getBaselineRateFromAPI(currencyType: 'AOA' | 'EUR'): Promise<number | null> {
  try {
    const bancoBaiData = await fetchBancoBaiExchangeRate()
    
    if (!bancoBaiData) {
      return null
    }

    // Convert Banco BAI rates to our exchange rate format
    if (currencyType === 'AOA') {
      // AOA to EUR rate (use sellValue as baseline)
      return 1 / bancoBaiData.sellValue
    } else {
      // EUR to AOA rate (use buyValue as baseline)
      return bancoBaiData.buyValue
    }
  } catch (error) {
    console.error('Error getting baseline rate from API:', error)
    return null
  }
}

/**
 * Validate exchange rate against market offers or API baseline
 */
export async function validateExchangeRate(
  currencyType: 'AOA' | 'EUR',
  proposedRate: number
): Promise<ExchangeRateValidationResult> {
  // Basic validation
  if (proposedRate <= 0) {
    return {
      isValid: false,
      reason: 'Exchange rate must be greater than zero',
      proposedRate,
      source: 'no_baseline'
    }
  }

  try {
    // First, try to get market rate from existing offers
    const marketRate = await getMarketRateFromOffers(currencyType)
    
    if (marketRate !== null) {
      // Validate against market offers with 20% margin
      const minRate = marketRate * (1 - MARKET_OFFERS_MARGIN)
      const maxRate = marketRate * (1 + MARKET_OFFERS_MARGIN)
      
      const isValid = proposedRate >= minRate && proposedRate <= maxRate
      
      return {
        isValid,
        reason: isValid 
          ? 'Rate is within acceptable market range'
          : `Rate must be between ${minRate.toFixed(6)} and ${maxRate.toFixed(6)} (±20% of market average)`,
        marketRate,
        proposedRate,
        allowedRange: { min: minRate, max: maxRate },
        source: 'market_offers'
      }
    }

    // If no market offers exist, validate against Banco BAI API baseline
    const baselineRate = await getBaselineRateFromAPI(currencyType)
    
    if (baselineRate !== null) {
      // Validate against API baseline with 50% margin
      const minRate = baselineRate * (1 - API_BASELINE_MARGIN)
      const maxRate = baselineRate * (1 + API_BASELINE_MARGIN)
      
      const isValid = proposedRate >= minRate && proposedRate <= maxRate
      
      return {
        isValid,
        reason: isValid
          ? 'Rate is within acceptable range of Banco BAI baseline'
          : `Rate must be between ${minRate.toFixed(6)} and ${maxRate.toFixed(6)} (±50% of Banco BAI baseline)`,
        marketRate: baselineRate,
        proposedRate,
        allowedRange: { min: minRate, max: maxRate },
        source: 'banco_bai_api'
      }
    }

    // If neither market offers nor API baseline are available, allow any positive rate
    return {
      isValid: true,
      reason: 'No baseline available, allowing any positive rate',
      proposedRate,
      source: 'no_baseline'
    }

  } catch (error) {
    console.error('Error validating exchange rate:', error)
    
    // In case of error, allow any positive rate to not block users
    return {
      isValid: true,
      reason: 'Validation error occurred, allowing rate',
      proposedRate,
      source: 'no_baseline'
    }
  }
}

/**
 * Get suggested exchange rate range for a currency
 */
export async function getSuggestedExchangeRateRange(
  currencyType: 'AOA' | 'EUR'
): Promise<{
  min: number
  max: number
  baseline: number
  source: 'market_offers' | 'banco_bai_api'
} | null> {
  try {
    // Try market offers first
    const marketRate = await getMarketRateFromOffers(currencyType)
    
    if (marketRate !== null) {
      return {
        min: marketRate * (1 - MARKET_OFFERS_MARGIN),
        max: marketRate * (1 + MARKET_OFFERS_MARGIN),
        baseline: marketRate,
        source: 'market_offers'
      }
    }

    // Fall back to API baseline
    const baselineRate = await getBaselineRateFromAPI(currencyType)
    
    if (baselineRate !== null) {
      return {
        min: baselineRate * (1 - API_BASELINE_MARGIN),
        max: baselineRate * (1 + API_BASELINE_MARGIN),
        baseline: baselineRate,
        source: 'banco_bai_api'
      }
    }

    return null
  } catch (error) {
    console.error('Error getting suggested exchange rate range:', error)
    return null
  }
}

/**
 * Format exchange rate validation error for user display
 */
export function formatExchangeRateError(
  validationResult: ExchangeRateValidationResult,
  currency: 'AOA' | 'EUR'
): string {
  if (validationResult.isValid) {
    return ''
  }

  const currencyName = currency === 'AOA' ? 'AOA' : 'EUR'
  
  if (validationResult.allowedRange) {
    const { min, max } = validationResult.allowedRange
    return `Taxa de câmbio para ${currencyName} deve estar entre ${min.toFixed(6)} e ${max.toFixed(6)}`
  }

  return `Taxa de câmbio inválida para ${currencyName}: ${validationResult.reason}`
}

// Export utility functions for use in API routes and components
export const ExchangeRateUtils = {
  validate: validateExchangeRate,
  getMarketRate: getMarketRateFromOffers,
  getBaselineRate: getBaselineRateFromAPI,
  getSuggestedRange: getSuggestedExchangeRateRange,
  formatError: formatExchangeRateError,
  fetchBancoBaiRate: fetchBancoBaiExchangeRate
}
