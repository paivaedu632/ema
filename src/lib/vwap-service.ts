/**
 * VWAP (Volume Weighted Average Price) Service for EmaPay
 * Handles dynamic exchange rate calculations with fallback mechanisms
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { Database } from '@/types/database.types'

export type DynamicRate = Database['public']['Tables']['dynamic_rates']['Row']
export type CurrencyPair = 'EUR_AOA' | 'AOA_EUR'
export type RateSource = 'vwap' | 'user_offers' | 'api_fallback' | 'no_rate_available'

export interface VWAPCalculationResult {
  vwap_rate: number
  transaction_count: number
  total_volume: number
  calculation_successful: boolean
}

export interface DynamicExchangeRateResult {
  exchange_rate: number
  rate_source: RateSource
  last_updated: string
}

export interface VWAPRateInfo {
  rate: number
  source: RateSource
  lastUpdated: Date
  transactionCount?: number
  totalVolume?: number
  isStale?: boolean
}

/**
 * VWAP Service class for managing dynamic exchange rates
 */
export class VWAPService {
  private static readonly CACHE_DURATION_MINUTES = 1 // Reduced cache duration for 1-minute window
  private static readonly DEFAULT_TIME_WINDOW_MINUTES = 1 // Changed from 60 to 1 minute
  private static readonly MINIMUM_TRANSACTIONS = 2 // Reduced minimum for 1-minute window

  /**
   * Get current dynamic exchange rate with fallback mechanisms
   */
  static async getDynamicExchangeRate(
    currencyType: 'EUR' | 'AOA',
    options: {
      fallbackToUserRates?: boolean
      fallbackToApiRate?: boolean
    } = {}
  ): Promise<VWAPRateInfo> {
    const { fallbackToUserRates = true, fallbackToApiRate = true } = options

    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_dynamic_exchange_rate', {
          currency_type: currencyType,
          fallback_to_user_rates: fallbackToUserRates,
          fallback_to_api_rate: fallbackToApiRate
        })

      if (error) {
        console.error('Error getting dynamic exchange rate:', error)
        throw new Error(`Failed to get dynamic exchange rate: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No exchange rate data returned')
      }

      const result = data[0] as DynamicExchangeRateResult

      return {
        rate: result.exchange_rate,
        source: result.rate_source as RateSource,
        lastUpdated: new Date(result.last_updated),
        isStale: this.isRateStale(new Date(result.last_updated))
      }
    } catch (error) {
      console.error('Error in getDynamicExchangeRate:', error)
      
      // Return fallback rate in case of error
      const fallbackRate = currencyType === 'EUR' ? 924.0675 : 0.001082
      return {
        rate: fallbackRate,
        source: 'api_fallback',
        lastUpdated: new Date(),
        isStale: false
      }
    }
  }

  /**
   * Calculate VWAP rate for a specific currency pair
   */
  static async calculateVWAPRate(
    currencyPair: CurrencyPair,
    timeWindowMinutes: number = VWAPService.DEFAULT_TIME_WINDOW_MINUTES,
    minimumTransactions: number = VWAPService.MINIMUM_TRANSACTIONS
  ): Promise<VWAPCalculationResult> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('calculate_vwap_rate', {
          target_currency_pair: currencyPair,
          time_window_minutes: timeWindowMinutes,
          minimum_transactions: minimumTransactions
        })

      if (error) {
        console.error('Error calculating VWAP rate:', error)
        throw new Error(`Failed to calculate VWAP rate: ${error.message}`)
      }

      if (!data || data.length === 0) {
        return {
          vwap_rate: 0,
          transaction_count: 0,
          total_volume: 0,
          calculation_successful: false
        }
      }

      return data[0] as VWAPCalculationResult
    } catch (error) {
      console.error('Error in calculateVWAPRate:', error)
      return {
        vwap_rate: 0,
        transaction_count: 0,
        total_volume: 0,
        calculation_successful: false
      }
    }
  }

  /**
   * Refresh all VWAP rates (both EUR_AOA and AOA_EUR)
   */
  static async refreshAllVWAPRates(): Promise<{
    success: boolean
    results: Array<{
      currency_pair: string
      new_rate: number
      transaction_count: number
      success: boolean
    }>
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('refresh_all_vwap_rates')

      if (error) {
        console.error('Error refreshing VWAP rates:', error)
        return {
          success: false,
          results: []
        }
      }

      return {
        success: true,
        results: data || []
      }
    } catch (error) {
      console.error('Error in refreshAllVWAPRates:', error)
      return {
        success: false,
        results: []
      }
    }
  }

  /**
   * Get stored dynamic rates from the database
   */
  static async getStoredDynamicRates(): Promise<DynamicRate[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('dynamic_rates')
        .select('*')
        .order('calculated_at', { ascending: false })

      if (error) {
        console.error('Error getting stored dynamic rates:', error)
        throw new Error(`Failed to get stored dynamic rates: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getStoredDynamicRates:', error)
      return []
    }
  }

  /**
   * Get the latest dynamic rate for a specific currency pair
   */
  static async getLatestDynamicRate(currencyPair: CurrencyPair): Promise<DynamicRate | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('dynamic_rates')
        .select('*')
        .eq('currency_pair', currencyPair)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        console.error('Error getting latest dynamic rate:', error)
        throw new Error(`Failed to get latest dynamic rate: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getLatestDynamicRate:', error)
      return null
    }
  }

  /**
   * Check if a rate is stale based on cache duration (1 minute for responsive updates)
   */
  private static isRateStale(lastUpdated: Date): boolean {
    const now = new Date()
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60)
    return diffMinutes > VWAPService.CACHE_DURATION_MINUTES
  }

  /**
   * Format rate for display (always in "1 EUR = X AOA" format)
   */
  static formatRateForDisplay(rate: number, currencyType: 'EUR' | 'AOA'): string {
    if (rate <= 0) {
      return 'Taxa não disponível'
    }

    // Always display in "1 EUR = X AOA" format
    if (currencyType === 'EUR') {
      // Rate is already in EUR to AOA format
      return `1 EUR = ${rate.toFixed(2)} AOA`
    } else {
      // Rate is in AOA to EUR format, convert to EUR to AOA
      const eurToAoaRate = 1 / rate
      return `1 EUR = ${eurToAoaRate.toFixed(2)} AOA`
    }
  }

  /**
   * Validate if a user-proposed rate is within acceptable range
   */
  static async validateUserRate(
    currencyType: 'EUR' | 'AOA',
    proposedRate: number,
    marginPercent: number = 20
  ): Promise<{
    isValid: boolean
    reason: string
    dynamicRate?: number
    allowedRange?: { min: number; max: number }
  }> {
    try {
      const dynamicRateInfo = await this.getDynamicExchangeRate(currencyType)
      
      if (dynamicRateInfo.source === 'no_rate_available') {
        // No baseline available, allow any positive rate
        return {
          isValid: proposedRate > 0,
          reason: proposedRate > 0 
            ? 'Rate accepted (no baseline available)' 
            : 'Rate must be positive'
        }
      }

      const baselineRate = dynamicRateInfo.rate
      const marginMultiplier = marginPercent / 100
      const minRate = baselineRate * (1 - marginMultiplier)
      const maxRate = baselineRate * (1 + marginMultiplier)

      const isValid = proposedRate >= minRate && proposedRate <= maxRate

      return {
        isValid,
        reason: isValid
          ? `Rate is within acceptable range (±${marginPercent}%)`
          : `Rate must be between ${minRate.toFixed(6)} and ${maxRate.toFixed(6)}`,
        dynamicRate: baselineRate,
        allowedRange: { min: minRate, max: maxRate }
      }
    } catch (error) {
      console.error('Error validating user rate:', error)
      
      // In case of error, allow any positive rate
      return {
        isValid: proposedRate > 0,
        reason: proposedRate > 0 
          ? 'Rate accepted (validation error occurred)' 
          : 'Rate must be positive'
      }
    }
  }
}
