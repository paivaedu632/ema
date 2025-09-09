/**
 * Fee Calculation Domain Service
 * 
 * Handles fee calculations for different transaction types.
 * Contains business logic for fee structures and calculations.
 */

import { Money } from '../value-objects/Money'
import { Currency } from '../value-objects/Currency'
import { TransactionType } from '../entities/Transaction'
import { User } from '../entities/User'

export interface FeeStructure {
  transactionType: TransactionType
  currency: Currency
  fixedFee: Money
  percentageFee: number // As decimal (0.02 = 2%)
  minimumFee: Money
  maximumFee: Money
}

export interface FeeCalculationResult {
  baseFee: Money
  percentageFee: Money
  totalFee: Money
  netAmount: Money
  feeBreakdown: {
    fixedComponent: Money
    percentageComponent: Money
    appliedRate: number
  }
}

export class FeeCalculationService {
  private readonly feeStructures: Map<string, FeeStructure> = new Map()

  constructor() {
    this.initializeDefaultFeeStructures()
  }

  /**
   * Calculate fee for a transaction
   */
  calculateFee(
    amount: Money,
    transactionType: TransactionType,
    user?: User
  ): FeeCalculationResult {
    const feeStructure = this.getFeeStructure(transactionType, amount.currency)
    
    if (!feeStructure) {
      throw new Error(`No fee structure found for ${transactionType} in ${amount.currency.code}`)
    }

    // Apply user-specific discounts if applicable
    const adjustedStructure = this.applyUserDiscounts(feeStructure, user)

    // Calculate fixed fee component
    const fixedComponent = adjustedStructure.fixedFee

    // Calculate percentage fee component
    const percentageAmount = amount.multiply(adjustedStructure.percentageFee)
    const percentageComponent = Money.fromNumber(percentageAmount.amount, amount.currency)

    // Calculate total fee before min/max constraints
    const totalBeforeConstraints = fixedComponent.add(percentageComponent)

    // Apply minimum and maximum constraints
    let totalFee = totalBeforeConstraints
    if (totalFee.isLessThan(adjustedStructure.minimumFee)) {
      totalFee = adjustedStructure.minimumFee
    } else if (totalFee.isGreaterThan(adjustedStructure.maximumFee)) {
      totalFee = adjustedStructure.maximumFee
    }

    // Calculate net amount
    const netAmount = amount.subtract(totalFee)

    return {
      baseFee: fixedComponent,
      percentageFee: percentageComponent,
      totalFee,
      netAmount,
      feeBreakdown: {
        fixedComponent,
        percentageComponent,
        appliedRate: adjustedStructure.percentageFee
      }
    }
  }

  /**
   * Calculate fee for currency exchange
   */
  calculateExchangeFee(
    inputAmount: Money,
    outputAmount: Money,
    transactionType: 'buy' | 'sell',
    user?: User
  ): FeeCalculationResult {
    // Use the input currency for fee calculation
    return this.calculateFee(inputAmount, transactionType, user)
  }

  /**
   * Calculate network/processing fee for external transactions
   */
  calculateNetworkFee(
    amount: Money,
    transactionType: TransactionType,
    isExternal: boolean = false
  ): Money {
    if (!isExternal) {
      return Money.zero(amount.currency)
    }

    // External transaction fees
    const networkFeeStructure = this.getNetworkFeeStructure(amount.currency)
    return networkFeeStructure.fixedFee
  }

  /**
   * Get fee estimate for display purposes
   */
  getFeeEstimate(
    amount: Money,
    transactionType: TransactionType,
    user?: User
  ): { estimatedFee: Money; feePercentage: number } {
    const result = this.calculateFee(amount, transactionType, user)
    const feePercentage = (result.totalFee.amount / amount.amount) * 100

    return {
      estimatedFee: result.totalFee,
      feePercentage
    }
  }

  /**
   * Check if transaction amount meets minimum fee requirements
   */
  meetsMinimumFeeRequirement(
    amount: Money,
    transactionType: TransactionType
  ): boolean {
    const feeStructure = this.getFeeStructure(transactionType, amount.currency)
    if (!feeStructure) return false

    const calculatedFee = this.calculateFee(amount, transactionType)
    return calculatedFee.totalFee.isGreaterThanOrEqual(feeStructure.minimumFee)
  }

  /**
   * Get fee structure for transaction type and currency
   */
  private getFeeStructure(
    transactionType: TransactionType,
    currency: Currency
  ): FeeStructure | undefined {
    const key = `${transactionType}-${currency.code}`
    return this.feeStructures.get(key)
  }

  /**
   * Apply user-specific fee discounts
   */
  private applyUserDiscounts(
    feeStructure: FeeStructure,
    user?: User
  ): FeeStructure {
    if (!user) {
      return feeStructure
    }

    // KYC-approved users get reduced fees
    if (user.isKycApproved()) {
      return {
        ...feeStructure,
        percentageFee: feeStructure.percentageFee * 0.8, // 20% discount
        fixedFee: feeStructure.fixedFee.multiply(0.8)
      }
    }

    return feeStructure
  }

  /**
   * Get network fee structure for external transactions
   */
  private getNetworkFeeStructure(currency: Currency): FeeStructure {
    const key = `network-${currency.code}`
    const structure = this.feeStructures.get(key)
    
    if (!structure) {
      // Default network fee
      return {
        transactionType: 'send',
        currency,
        fixedFee: Money.fromNumber(currency.isEUR() ? 2 : 2400, currency), // 2 EUR or 2400 AOA
        percentageFee: 0,
        minimumFee: Money.fromNumber(currency.isEUR() ? 1 : 1200, currency),
        maximumFee: Money.fromNumber(currency.isEUR() ? 10 : 12000, currency)
      }
    }

    return structure
  }

  /**
   * Initialize default fee structures
   */
  private initializeDefaultFeeStructures(): void {
    const eurCurrency = Currency.EUR()
    const aoaCurrency = Currency.AOA()

    // Send transaction fees
    this.feeStructures.set('send-EUR', {
      transactionType: 'send',
      currency: eurCurrency,
      fixedFee: Money.fromNumber(0.5, eurCurrency),
      percentageFee: 0.015, // 1.5%
      minimumFee: Money.fromNumber(0.5, eurCurrency),
      maximumFee: Money.fromNumber(25, eurCurrency)
    })

    this.feeStructures.set('send-AOA', {
      transactionType: 'send',
      currency: aoaCurrency,
      fixedFee: Money.fromNumber(600, aoaCurrency),
      percentageFee: 0.015, // 1.5%
      minimumFee: Money.fromNumber(600, aoaCurrency),
      maximumFee: Money.fromNumber(30000, aoaCurrency)
    })

    // Buy transaction fees (buying AOA with EUR)
    this.feeStructures.set('buy-EUR', {
      transactionType: 'buy',
      currency: eurCurrency,
      fixedFee: Money.fromNumber(1, eurCurrency),
      percentageFee: 0.02, // 2%
      minimumFee: Money.fromNumber(1, eurCurrency),
      maximumFee: Money.fromNumber(50, eurCurrency)
    })

    // Sell transaction fees (selling AOA for EUR)
    this.feeStructures.set('sell-AOA', {
      transactionType: 'sell',
      currency: aoaCurrency,
      fixedFee: Money.fromNumber(1200, aoaCurrency),
      percentageFee: 0.02, // 2%
      minimumFee: Money.fromNumber(1200, aoaCurrency),
      maximumFee: Money.fromNumber(60000, aoaCurrency)
    })

    // Deposit fees (usually free or minimal)
    this.feeStructures.set('deposit-EUR', {
      transactionType: 'deposit',
      currency: eurCurrency,
      fixedFee: Money.zero(eurCurrency),
      percentageFee: 0,
      minimumFee: Money.zero(eurCurrency),
      maximumFee: Money.fromNumber(5, eurCurrency)
    })

    this.feeStructures.set('deposit-AOA', {
      transactionType: 'deposit',
      currency: aoaCurrency,
      fixedFee: Money.zero(aoaCurrency),
      percentageFee: 0,
      minimumFee: Money.zero(aoaCurrency),
      maximumFee: Money.fromNumber(6000, aoaCurrency)
    })

    // Withdraw fees
    this.feeStructures.set('withdraw-EUR', {
      transactionType: 'withdraw',
      currency: eurCurrency,
      fixedFee: Money.fromNumber(2, eurCurrency),
      percentageFee: 0.005, // 0.5%
      minimumFee: Money.fromNumber(2, eurCurrency),
      maximumFee: Money.fromNumber(20, eurCurrency)
    })

    this.feeStructures.set('withdraw-AOA', {
      transactionType: 'withdraw',
      currency: aoaCurrency,
      fixedFee: Money.fromNumber(2400, aoaCurrency),
      percentageFee: 0.005, // 0.5%
      minimumFee: Money.fromNumber(2400, aoaCurrency),
      maximumFee: Money.fromNumber(24000, aoaCurrency)
    })
  }
}
