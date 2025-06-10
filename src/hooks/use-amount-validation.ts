'use client'

import { useMemo } from 'react'
import { isValidTransactionAmount } from '@/utils/fee-calculations'

interface UseAmountValidationOptions {
  amount: string | number
  currency?: string
  minAmount?: number
  maxAmount?: number
  required?: boolean
}

interface UseAmountValidationReturn {
  isValid: boolean
  canContinue: boolean
  errorMessage?: string
  isEmpty: boolean
  isZero: boolean
  isNegative: boolean
  isBelowMin: boolean
  isAboveMax: boolean
}

/**
 * Reusable hook for amount validation across transaction flows
 * Consolidates common validation logic used in buy, sell, send, etc.
 */
export function useAmountValidation({
  amount,
  currency = '',
  minAmount = 0,
  maxAmount,
  required = true
}: UseAmountValidationOptions): UseAmountValidationReturn {
  
  const validation = useMemo(() => {
    // Convert to string for consistent handling
    const amountStr = String(amount)
    const numAmount = Number(amount)
    
    // Check basic conditions
    const isEmpty = !amountStr || amountStr.trim() === ''
    const isZero = amountStr === '0' || numAmount === 0
    const isNaN = Number.isNaN(numAmount)
    const isNegative = numAmount < 0
    const isBelowMin = numAmount < minAmount
    const isAboveMax = maxAmount !== undefined && numAmount > maxAmount
    
    // Determine validity
    let isValid = true
    let errorMessage: string | undefined
    
    if (required && isEmpty) {
      isValid = false
      errorMessage = 'Valor é obrigatório'
    } else if (!isEmpty && isNaN) {
      isValid = false
      errorMessage = 'Valor deve ser um número válido'
    } else if (!isEmpty && isNegative) {
      isValid = false
      errorMessage = 'Valor deve ser positivo'
    } else if (!isEmpty && isZero) {
      isValid = false
      errorMessage = 'Valor deve ser maior que zero'
    } else if (!isEmpty && isBelowMin) {
      isValid = false
      errorMessage = `Valor mínimo é ${minAmount} ${currency}`.trim()
    } else if (!isEmpty && isAboveMax) {
      isValid = false
      errorMessage = `Valor máximo é ${maxAmount} ${currency}`.trim()
    }
    
    // Can continue if valid or if not required and empty
    const canContinue = isValid || (!required && isEmpty)
    
    return {
      isValid,
      canContinue,
      errorMessage,
      isEmpty,
      isZero,
      isNegative,
      isBelowMin,
      isAboveMax
    }
  }, [amount, currency, minAmount, maxAmount, required])
  
  return validation
}

/**
 * Simplified validation hook that matches existing EmaPay patterns
 * Returns boolean for canContinue logic used across flows
 */
export function useCanContinue(amount: string | number): boolean {
  return useMemo(() => {
    return isValidTransactionAmount(amount)
  }, [amount])
}

/**
 * Hook for validating exchange rates
 */
export function useExchangeRateValidation(rate: string | number) {
  return useMemo(() => {
    const numRate = typeof rate === 'string' ? Number(rate) : rate
    const isValid = !isNaN(numRate) && numRate > 0
    
    return {
      isValid,
      canContinue: isValid,
      errorMessage: isValid ? undefined : 'Taxa de câmbio deve ser maior que zero'
    }
  }, [rate])
}
