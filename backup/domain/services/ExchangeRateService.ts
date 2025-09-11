/**
 * Exchange Rate Domain Service
 * 
 * Handles currency exchange rate calculations and validations.
 * Contains business logic for exchange rate operations.
 */

import { Money } from '../value-objects/Money'
import { Currency } from '../value-objects/Currency'

export interface ExchangeRate {
  fromCurrency: Currency
  toCurrency: Currency
  rate: number
  timestamp: Date
  source: string
}

export interface ExchangeRateProvider {
  getCurrentRate(fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRate>
  getHistoricalRate(fromCurrency: Currency, toCurrency: Currency, date: Date): Promise<ExchangeRate>
}

export class ExchangeRateService {
  private readonly rateProvider: ExchangeRateProvider

  constructor(rateProvider: ExchangeRateProvider) {
    this.rateProvider = rateProvider
  }

  /**
   * Convert money from one currency to another
   */
  async convertMoney(
    amount: Money,
    targetCurrency: Currency,
    useCurrentRate: boolean = true
  ): Promise<Money> {
    if (amount.currency.equals(targetCurrency)) {
      return amount
    }

    const exchangeRate = useCurrentRate
      ? await this.rateProvider.getCurrentRate(amount.currency, targetCurrency)
      : await this.rateProvider.getCurrentRate(amount.currency, targetCurrency)

    const convertedAmount = amount.amount * exchangeRate.rate
    return Money.fromNumber(convertedAmount, targetCurrency)
  }

  /**
   * Calculate exchange amount for a given input
   */
  async calculateExchangeAmount(
    inputAmount: Money,
    outputCurrency: Currency,
    exchangeRate?: number
  ): Promise<{ outputAmount: Money; rate: ExchangeRate }> {
    let rate: ExchangeRate

    if (exchangeRate) {
      // Use provided rate
      rate = {
        fromCurrency: inputAmount.currency,
        toCurrency: outputCurrency,
        rate: exchangeRate,
        timestamp: new Date(),
        source: 'manual'
      }
    } else {
      // Get current market rate
      rate = await this.rateProvider.getCurrentRate(inputAmount.currency, outputCurrency)
    }

    const outputAmount = Money.fromNumber(
      inputAmount.amount * rate.rate,
      outputCurrency
    )

    return { outputAmount, rate }
  }

  /**
   * Calculate the inverse exchange rate
   */
  calculateInverseRate(rate: ExchangeRate): ExchangeRate {
    return {
      fromCurrency: rate.toCurrency,
      toCurrency: rate.fromCurrency,
      rate: 1 / rate.rate,
      timestamp: rate.timestamp,
      source: rate.source
    }
  }

  /**
   * Validate exchange rate is within acceptable bounds
   */
  validateExchangeRate(
    rate: ExchangeRate,
    expectedRate?: number,
    tolerancePercentage: number = 5
  ): boolean {
    if (!expectedRate) {
      return true
    }

    const difference = Math.abs(rate.rate - expectedRate)
    const tolerance = expectedRate * (tolerancePercentage / 100)
    
    return difference <= tolerance
  }

  /**
   * Check if exchange rate is stale
   */
  isRateStale(rate: ExchangeRate, maxAgeMinutes: number = 5): boolean {
    const now = new Date()
    const ageMinutes = (now.getTime() - rate.timestamp.getTime()) / (1000 * 60)
    return ageMinutes > maxAgeMinutes
  }

  /**
   * Get supported currency pairs
   */
  getSupportedPairs(): Array<{ from: Currency; to: Currency }> {
    return [
      { from: Currency.EUR(), to: Currency.AOA() },
      { from: Currency.AOA(), to: Currency.EUR() }
    ]
  }

  /**
   * Check if currency pair is supported
   */
  isPairSupported(fromCurrency: Currency, toCurrency: Currency): boolean {
    return this.getSupportedPairs().some(pair =>
      pair.from.equals(fromCurrency) && pair.to.equals(toCurrency)
    )
  }

  /**
   * Calculate spread between buy and sell rates
   */
  calculateSpread(buyRate: number, sellRate: number): number {
    return Math.abs(buyRate - sellRate) / ((buyRate + sellRate) / 2) * 100
  }

  /**
   * Apply spread to exchange rate
   */
  applySpread(
    baseRate: number,
    spreadPercentage: number,
    operation: 'buy' | 'sell'
  ): number {
    const spreadMultiplier = spreadPercentage / 100
    
    if (operation === 'buy') {
      // When buying foreign currency, rate is higher (less favorable)
      return baseRate * (1 + spreadMultiplier)
    } else {
      // When selling foreign currency, rate is lower (less favorable)
      return baseRate * (1 - spreadMultiplier)
    }
  }
}

/**
 * Mock Exchange Rate Provider for testing and development
 */
export class MockExchangeRateProvider implements ExchangeRateProvider {
  private readonly mockRates: Map<string, number> = new Map([
    ['EUR-AOA', 1200], // 1 EUR = 1200 AOA
    ['AOA-EUR', 1/1200] // 1 AOA = 0.000833 EUR
  ])

  async getCurrentRate(fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRate> {
    const key = `${fromCurrency.code}-${toCurrency.code}`
    const rate = this.mockRates.get(key)
    
    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCurrency.code} to ${toCurrency.code}`)
    }

    return {
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date(),
      source: 'mock'
    }
  }

  async getHistoricalRate(
    fromCurrency: Currency,
    toCurrency: Currency,
    date: Date
  ): Promise<ExchangeRate> {
    // For mock, return current rate
    return this.getCurrentRate(fromCurrency, toCurrency)
  }

  /**
   * Update mock rate for testing
   */
  setMockRate(fromCurrency: Currency, toCurrency: Currency, rate: number): void {
    const key = `${fromCurrency.code}-${toCurrency.code}`
    this.mockRates.set(key, rate)
    
    // Also set inverse rate
    const inverseKey = `${toCurrency.code}-${fromCurrency.code}`
    this.mockRates.set(inverseKey, 1 / rate)
  }
}
