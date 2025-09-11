/**
 * Currency Value Object
 * 
 * Represents a currency with validation and formatting capabilities.
 * Follows the Value Object pattern - immutable and equality by value.
 */

export type CurrencyCode = 'EUR' | 'AOA'

interface CurrencyInfo {
  code: CurrencyCode
  name: string
  symbol: string
  decimalPlaces: number
}

const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2
  },
  AOA: {
    code: 'AOA',
    name: 'Kwanza Angolano',
    symbol: 'Kz',
    decimalPlaces: 2
  }
} as const

export class Currency {
  private readonly _code: CurrencyCode
  private readonly _info: CurrencyInfo

  private constructor(code: CurrencyCode) {
    this._code = code
    this._info = SUPPORTED_CURRENCIES[code]
  }

  /**
   * Create Currency from currency code
   */
  static fromCode(code: string): Currency {
    const upperCode = code.toUpperCase() as CurrencyCode
    
    if (!this.isSupported(upperCode)) {
      throw new Error(`Unsupported currency: ${code}. Supported currencies: ${this.getSupportedCodes().join(', ')}`)
    }
    
    return new Currency(upperCode)
  }

  /**
   * Create EUR currency
   */
  static EUR(): Currency {
    return new Currency('EUR')
  }

  /**
   * Create AOA currency
   */
  static AOA(): Currency {
    return new Currency('AOA')
  }

  /**
   * Check if currency code is supported
   */
  static isSupported(code: string): code is CurrencyCode {
    return Object.keys(SUPPORTED_CURRENCIES).includes(code.toUpperCase())
  }

  /**
   * Get all supported currency codes
   */
  static getSupportedCodes(): CurrencyCode[] {
    return Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]
  }

  /**
   * Get all supported currencies
   */
  static getAllSupported(): Currency[] {
    return this.getSupportedCodes().map(code => new Currency(code))
  }

  /**
   * Get currency code
   */
  get code(): CurrencyCode {
    return this._code
  }

  /**
   * Get currency name
   */
  get name(): string {
    return this._info.name
  }

  /**
   * Get currency symbol
   */
  get symbol(): string {
    return this._info.symbol
  }

  /**
   * Get number of decimal places
   */
  get decimalPlaces(): number {
    return this._info.decimalPlaces
  }

  /**
   * Check if this currency equals another
   */
  equals(other: Currency): boolean {
    return this._code === other._code
  }

  /**
   * Check if this is EUR
   */
  isEUR(): boolean {
    return this._code === 'EUR'
  }

  /**
   * Check if this is AOA
   */
  isAOA(): boolean {
    return this._code === 'AOA'
  }

  /**
   * Get the opposite currency (EUR <-> AOA)
   */
  getOpposite(): Currency {
    return this.isEUR() ? Currency.AOA() : Currency.EUR()
  }

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number): string {
    return `${this._info.symbol}${amount.toFixed(this._info.decimalPlaces)}`
  }

  /**
   * Format amount for input (without symbol)
   */
  formatAmountForInput(amount: number): string {
    return amount.toFixed(this._info.decimalPlaces)
  }

  /**
   * Parse amount from string input
   */
  parseAmount(input: string): number {
    // Remove currency symbol and whitespace
    const cleanInput = input.replace(this._info.symbol, '').trim()
    const amount = parseFloat(cleanInput)
    
    if (isNaN(amount)) {
      throw new Error(`Invalid amount format: ${input}`)
    }
    
    return amount
  }

  /**
   * Validate amount precision for this currency
   */
  validateAmountPrecision(amount: number): boolean {
    const factor = Math.pow(10, this._info.decimalPlaces)
    return Math.round(amount * factor) === amount * factor
  }

  /**
   * Round amount to currency precision
   */
  roundAmount(amount: number): number {
    const factor = Math.pow(10, this._info.decimalPlaces)
    return Math.round(amount * factor) / factor
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._code
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): string {
    return this._code
  }
}

// Export commonly used currencies as constants
export const EUR = Currency.EUR()
export const AOA = Currency.AOA()

// Export type for external use
export type { CurrencyCode }
