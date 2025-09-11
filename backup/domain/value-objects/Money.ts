/**
 * Money Value Object
 * 
 * Represents monetary amounts with currency information.
 * Provides type-safe arithmetic operations and validation.
 * Follows the Value Object pattern - immutable and equality by value.
 */

import { Currency } from './Currency'

export class Money {
  private readonly _amount: number
  private readonly _currency: Currency

  private constructor(amount: number, currency: Currency) {
    this._amount = amount
    this._currency = currency
  }

  /**
   * Create Money from number amount and currency
   */
  static fromNumber(amount: number, currency: Currency): Money {
    if (!Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number')
    }
    
    if (amount < 0) {
      throw new Error('Amount cannot be negative')
    }

    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100
    
    return new Money(roundedAmount, currency)
  }

  /**
   * Create Money from string amount (for user input)
   */
  static fromString(amount: string, currency: Currency): Money {
    const numericAmount = parseFloat(amount)
    
    if (isNaN(numericAmount)) {
      throw new Error('Invalid amount format')
    }
    
    return Money.fromNumber(numericAmount, currency)
  }

  /**
   * Create zero amount for given currency
   */
  static zero(currency: Currency): Money {
    return new Money(0, currency)
  }

  /**
   * Get the numeric amount
   */
  get amount(): number {
    return this._amount
  }

  /**
   * Get the currency
   */
  get currency(): Currency {
    return this._currency
  }

  /**
   * Add another Money amount (must be same currency)
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other)
    return new Money(this._amount + other._amount, this._currency)
  }

  /**
   * Subtract another Money amount (must be same currency)
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other)
    const result = this._amount - other._amount
    
    if (result < 0) {
      throw new Error('Subtraction would result in negative amount')
    }
    
    return new Money(result, this._currency)
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error('Factor must be a positive finite number')
    }
    
    return new Money(this._amount * factor, this._currency)
  }

  /**
   * Divide by a divisor
   */
  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor <= 0) {
      throw new Error('Divisor must be a positive finite number')
    }
    
    return new Money(this._amount / divisor, this._currency)
  }

  /**
   * Check if this amount is greater than another
   */
  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount > other._amount
  }

  /**
   * Check if this amount is greater than or equal to another
   */
  isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount >= other._amount
  }

  /**
   * Check if this amount is less than another
   */
  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount < other._amount
  }

  /**
   * Check if this amount is less than or equal to another
   */
  isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount <= other._amount
  }

  /**
   * Check if this amount is equal to another
   */
  equals(other: Money): boolean {
    return this._currency.equals(other._currency) &&
           Math.abs(this._amount - other._amount) < 0.01 // Account for floating point precision
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this._amount === 0
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this._amount > 0
  }

  /**
   * Format as string for display
   */
  toString(): string {
    return `${this._currency.symbol}${this._amount.toFixed(2)}`
  }

  /**
   * Format for API/database storage
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this._amount,
      currency: this._currency.code
    }
  }

  /**
   * Ensure two Money objects have the same currency
   */
  private ensureSameCurrency(other: Money): void {
    if (!this._currency.equals(other._currency)) {
      throw new Error(`Cannot operate on different currencies: ${this._currency.code} and ${other._currency.code}`)
    }
  }
}
