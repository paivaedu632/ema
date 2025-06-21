/**
 * Reusable utilities for handling insufficient balance scenarios across transaction components
 * Provides consistent error messages, validation, and deposit flow integration
 */

import { VALIDATION_MESSAGES, type Currency } from './transaction-validation'

export interface InsufficientBalanceState {
  hasInsufficientBalance: boolean
  errorMessage: string | null
  shouldShowDepositButton: boolean
  shouldDisableComponents: boolean
}

/**
 * Check if user has insufficient balance for a transaction
 */
export function checkInsufficientBalance(
  amount: string | number,
  availableBalance: number,
  currency: Currency,
  transactionType: 'buy' | 'sell' | 'send' = 'buy'
): InsufficientBalanceState {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // If no amount entered yet, don't show insufficient balance error
  if (!amount || amount === '' || amount === '0' || isNaN(numericAmount) || numericAmount <= 0) {
    return {
      hasInsufficientBalance: false,
      errorMessage: null,
      shouldShowDepositButton: false,
      shouldDisableComponents: false
    }
  }

  // Check if balance is insufficient
  const hasInsufficientBalance = numericAmount > availableBalance

  return {
    hasInsufficientBalance,
    errorMessage: hasInsufficientBalance ? VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE : null,
    shouldShowDepositButton: hasInsufficientBalance,
    shouldDisableComponents: hasInsufficientBalance
  }
}

/**
 * Get deposit button text with currency context
 */
export function getDepositButtonText(currency: Currency): string {
  return 'Depositar'
}

/**
 * Get deposit route for navigation
 */
export function getDepositRoute(): string {
  return '/deposit'
}

/**
 * Format insufficient balance error message with deposit button
 * Returns JSX-compatible structure for rendering
 */
export function formatInsufficientBalanceMessage(currency: Currency): {
  message: string
  buttonText: string
  route: string
} {
  return {
    message: VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE,
    buttonText: getDepositButtonText(currency),
    route: getDepositRoute()
  }
}

/**
 * Check if user has zero balance (special case for empty wallet)
 */
export function hasZeroBalance(availableBalance: number): boolean {
  return availableBalance <= 0
}

/**
 * Get appropriate error message based on balance state
 */
export function getBalanceErrorMessage(
  amount: string | number,
  availableBalance: number,
  currency: Currency
): string | null {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // No error if no amount entered
  if (!amount || amount === '' || amount === '0' || isNaN(numericAmount) || numericAmount <= 0) {
    return null
  }

  // Check insufficient balance
  if (numericAmount > availableBalance) {
    return VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE
  }

  return null
}

/**
 * Determine if components should be disabled based on balance state
 */
export function shouldDisableComponentsForBalance(
  amount: string | number,
  availableBalance: number
): boolean {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Don't disable if no amount entered
  if (!amount || amount === '' || amount === '0' || isNaN(numericAmount) || numericAmount <= 0) {
    return false
  }

  // Disable if insufficient balance
  return numericAmount > availableBalance
}
