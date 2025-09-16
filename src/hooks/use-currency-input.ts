import { useState, useCallback } from 'react'
import { Currency } from '@/types'
import {
  ValidationResult,
  processInputChange,
  formatPortugueseInput,
  parsePortugueseNumber
} from '@/lib/currency-validation'

export interface CurrencyInputState {
  displayValue: string
  numericValue: number
  validation: ValidationResult
}

export interface UseCurrencyInputProps {
  currency: Currency
  exchangeRate: number
  initialValue?: number
  onValueChange?: (numericValue: number) => void
}

export function useCurrencyInput({
  currency,
  exchangeRate,
  initialValue = 0,
  onValueChange
}: UseCurrencyInputProps) {
  const [state, setState] = useState<CurrencyInputState>(() => ({
    displayValue: initialValue > 0 ? formatPortugueseInput(initialValue) : '',
    numericValue: initialValue,
    validation: { isValid: true }
  }))

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    
    // Allow empty input
    if (inputValue === '') {
      const newState = {
        displayValue: '',
        numericValue: 0,
        validation: { isValid: true }
      }
      setState(newState)
      onValueChange?.(0)
      return
    }
    
    // Process the input
    const result = processInputChange(inputValue, currency, exchangeRate)
    
    const newState = {
      displayValue: result.formattedValue,
      numericValue: result.numericValue,
      validation: result.validation
    }
    
    setState(newState)
    onValueChange?.(result.numericValue)
  }, [currency, exchangeRate, onValueChange])

  const setValue = useCallback((value: number) => {
    const newState = {
      displayValue: value > 0 ? formatPortugueseInput(value) : '',
      numericValue: value,
      validation: { isValid: true }
    }
    setState(newState)
  }, [])

  const setDisplayValue = useCallback((displayValue: string) => {
    const numericValue = parsePortugueseNumber(displayValue)
    const result = processInputChange(displayValue, currency, exchangeRate)
    
    const newState = {
      displayValue: result.formattedValue,
      numericValue: result.numericValue,
      validation: result.validation
    }
    
    setState(newState)
  }, [currency, exchangeRate])

  return {
    ...state,
    handleInputChange,
    setValue,
    setDisplayValue
  }
}
