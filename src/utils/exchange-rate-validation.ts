/**
 * Exchange Rate Validation Utilities for EmaPay P2P Exchange
 * 
 * Handles validation of exchange rates against existing market offers
 * and Banco BAI API baseline rates with proper margin calculations
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { EXCHANGE_RATE_VALIDATION, VALIDATION_MESSAGES } from '@/utils/transaction-validation'

// Exchange rate validation constants (using shared constants)
export const MARKET_OFFERS_MARGIN = EXCHANGE_RATE_VALIDATION.MARKET_OFFERS_MARGIN
export const API_BASELINE_MARGIN = EXCHANGE_RATE_VALIDATION.API_BASELINE_MARGIN
export const MARKET_OFFERS_WINDOW_HOURS = 24 // Consider offers from last 24 hours

// Banco BAI API configuration
export const BANCO_BAI_API = {
  BASE_URL: process.env.BANCO_BAI_API_URL || 'https://ib.bancobai.ao/portal/api/internet/exchange/table?currency=AKZ&appVersion=v1.11.04'
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
  description: string
  lastUpdateDate: string
  type: number
}

export interface BancoBaiApiFullResponse {
  message: string
  data: {
    originCurrency: string
    originCurrencyDescription: string
    exchangeTableEntryViewList: BancoBaiApiResponse[]
  }
}

/**
 * Fetch current exchange rate from Banco BAI API
 */
export async function fetchBancoBaiExchangeRate(): Promise<BancoBaiApiResponse | null> {
  try {
    const response = await fetch(BANCO_BAI_API.BASE_URL, {
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

    const data: BancoBaiApiFullResponse = await response.json()

    // Find EUR exchange rate in the response
    const eurRate = data.data?.exchangeTableEntryViewList?.find(rate => rate.currency === 'EUR')

    if (!eurRate) {
      console.error('EUR rate not found in Banco BAI API response')
      return null
    }

    return {
      sellValue: parseFloat(eurRate.sellValue.toString()),
      buyValue: parseFloat(eurRate.buyValue.toString()),
      currency: eurRate.currency,
      description: eurRate.description,
      lastUpdateDate: eurRate.lastUpdateDate,
      type: eurRate.type
    }
  } catch (error) {
    console.error('Error fetching Banco BAI exchange rate:', error)
    return null
  }
}

/**
 * Get market rate from existing active offers
 * Returns rate in "1 EUR = X AOA" format regardless of currency_type
 */
export async function getMarketRateFromOffers(currencyType: 'AOA' | 'EUR'): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('offers')
      .select('exchange_rate, currency_type')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - MARKET_OFFERS_WINDOW_HOURS * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error fetching market offers:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Convert all rates to "1 EUR = X AOA" format for consistency
    const normalizedRates = data.map(offer => {
      const rate = parseFloat(offer.exchange_rate.toString())

      // If rate is very small (< 1), it's likely in old "1 AOA = Y EUR" format
      // Convert it to "1 EUR = X AOA" format
      if (rate < 1) {
        return 1 / rate
      }

      // If rate is large (>= 1), it's already in "1 EUR = X AOA" format
      return rate
    })

    // Calculate average exchange rate from normalized rates
    const averageRate = normalizedRates.reduce((sum, rate) => sum + rate, 0) / normalizedRates.length

    return averageRate
  } catch (error) {
    console.error('Error calculating market rate:', error)
    return null
  }
}

/**
 * Get baseline rate from Banco BAI API
 * Returns rate in "1 EUR = X AOA" format for all currency types
 */
export async function getBaselineRateFromAPI(currencyType: 'AOA' | 'EUR'): Promise<number | null> {
  try {
    const bancoBaiData = await fetchBancoBaiExchangeRate()

    if (!bancoBaiData) {
      return null
    }

    // Simplified: Always return rate in "1 EUR = X AOA" format
    // Use buyValue as the baseline (what bank pays when you sell EUR to them)
    // This represents a fair market rate for P2P exchanges
    return bancoBaiData.buyValue
  } catch (error) {
    console.error('Error getting baseline rate from API:', error)
    return null
  }
}

/**
 * Validate exchange rate against market offers or API baseline
 * All rates are expected in "1 EUR = X AOA" format (simplified approach)
 */
export async function validateExchangeRate(
  currencyType: 'AOA' | 'EUR',
  proposedRate: number
): Promise<ExchangeRateValidationResult> {
  // Basic validation
  if (proposedRate <= 0) {
    return {
      isValid: false,
      reason: VALIDATION_MESSAGES.EXCHANGE_RATE.INVALID_POSITIVE,
      proposedRate,
      source: 'no_baseline'
    }
  }

  // Additional validation: rate should be in reasonable range for "1 EUR = X AOA" format
  // Typical range: 800-1500 AOA per EUR
  if (proposedRate < 500 || proposedRate > 2000) {
    return {
      isValid: false,
      reason: `Exchange rate ${proposedRate} is outside reasonable range (500-2000 AOA per EUR)`,
      proposedRate,
      source: 'no_baseline'
    }
  }

  try {
    // First, try to get market rate from existing offers (normalized to EUR=AOA format)
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
          : `Rate must be between ${minRate.toFixed(2)} and ${maxRate.toFixed(2)} AOA per EUR (±20% of market average)`,
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
          : `Rate must be between ${minRate.toFixed(2)} and ${maxRate.toFixed(2)} AOA per EUR (±50% of Banco BAI baseline)`,
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
 * Returns range in "1 EUR = X AOA" format
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
    // Try market offers first (normalized to EUR=AOA format)
    const marketRate = await getMarketRateFromOffers(currencyType)

    if (marketRate !== null) {
      return {
        min: marketRate * (1 - MARKET_OFFERS_MARGIN),
        max: marketRate * (1 + MARKET_OFFERS_MARGIN),
        baseline: marketRate,
        source: 'market_offers'
      }
    }

    // Fall back to API baseline (already in EUR=AOA format)
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
 * Uses "1 EUR = X AOA" format with 2 decimal places
 */
export function formatExchangeRateError(
  validationResult: ExchangeRateValidationResult,
  currency: 'AOA' | 'EUR'
): string {
  if (validationResult.isValid) {
    return ''
  }

  if (validationResult.allowedRange) {
    const { min, max } = validationResult.allowedRange
    return `Taxa de câmbio deve estar entre ${min.toFixed(2)} e ${max.toFixed(2)} AOA por EUR`
  }

  // Use shared validation message for out of range errors
  return VALIDATION_MESSAGES.EXCHANGE_RATE.OUT_OF_RANGE
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
