/**
 * Currency Pair Utility for EmaPay
 * 
 * Standardizes all currency pair handling to AOA/EUR format
 * All prices are stored as "AOA per EUR" (e.g., 1250 = 1250 AOA for 1 EUR)
 */

export type Currency = 'EUR' | 'AOA'

export interface CurrencyPair {
  base: Currency
  quote: Currency
}

export class CurrencyPairHandler {
  /**
   * Calculate the cost in quote currency for a given quantity and price
   * 
   * @param baseCurrency - Currency being bought
   * @param quoteCurrency - Currency being paid with
   * @param quantity - Amount of base currency to buy
   * @param price - Price stored as AOA per EUR
   * @returns Cost in quote currency
   */
  static calculateCost(
    baseCurrency: Currency,
    quoteCurrency: Currency,
    quantity: number,
    price: number
  ): number {
    // Validate inputs
    if (baseCurrency === quoteCurrency) {
      throw new Error('Base and quote currencies must be different')
    }
    
    if (quantity <= 0) {
      throw new Error('Quantity must be positive')
    }
    
    if (price <= 0) {
      throw new Error('Price must be positive')
    }
    
    // All prices are stored as AOA per EUR
    // So price = AOA/EUR ratio
    
    if (baseCurrency === 'EUR' && quoteCurrency === 'AOA') {
      // Buying EUR with AOA
      // Cost = EUR_quantity × (AOA/EUR) = AOA_cost
      return quantity * price
    } else if (baseCurrency === 'AOA' && quoteCurrency === 'EUR') {
      // Buying AOA with EUR  
      // Cost = AOA_quantity ÷ (AOA/EUR) = EUR_cost
      return quantity / price
    } else {
      throw new Error(`Unsupported currency pair: ${baseCurrency}/${quoteCurrency}`)
    }
  }
  
  /**
   * Validate that a currency pair is supported
   */
  static validatePair(baseCurrency: Currency, quoteCurrency: Currency): void {
    if (baseCurrency === quoteCurrency) {
      throw new Error('Base and quote currencies must be different')
    }
    
    const supportedCurrencies: Currency[] = ['EUR', 'AOA']
    
    if (!supportedCurrencies.includes(baseCurrency)) {
      throw new Error(`Unsupported base currency: ${baseCurrency}`)
    }
    
    if (!supportedCurrencies.includes(quoteCurrency)) {
      throw new Error(`Unsupported quote currency: ${quoteCurrency}`)
    }
  }
  
  /**
   * Format price for display
   * Always shows as "X AOA per EUR" regardless of pair direction
   */
  static formatPrice(price: number): string {
    return `${price.toFixed(2)} AOA per EUR`
  }
  
  /**
   * Get the standard pair notation for database queries
   * Always returns base_currency and quote_currency for order book queries
   */
  static getPairForQuery(baseCurrency: Currency, quoteCurrency: Currency): CurrencyPair {
    this.validatePair(baseCurrency, quoteCurrency)
    return { base: baseCurrency, quote: quoteCurrency }
  }
}
