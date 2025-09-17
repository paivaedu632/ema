import { useState, useCallback } from 'react'
import { Currency } from '@/types'
import {
  ValidationResult,
  PriorityValidationResult,
  processInputChange,
  processInputChangeWithPriority,
  formatPortugueseInput,
  parsePortugueseNumber
} from '@/lib/currency-validation'

export interface CurrencyInputState {
  displayValue: string
  numericValue: number
  validation: ValidationResult
  priorityValidation?: PriorityValidationResult
}

export interface UseCurrencyInputProps {
  currency: Currency
  exchangeRate: number
  initialValue?: number
  onValueChange?: (numericValue: number) => void
  availableBalance?: number
  isRequired?: boolean
  usePriorityValidation?: boolean
}

export function useCurrencyInput({
  currency,
  exchangeRate,
  initialValue = 0,
  onValueChange,
  availableBalance,
  isRequired = false,
  usePriorityValidation = false
}: UseCurrencyInputProps) {
  const [state, setState] = useState<CurrencyInputState>(() => ({
    displayValue: initialValue > 0 ? formatPortugueseInput(initialValue) : '',
    numericValue: initialValue,
    validation: { isValid: true },
    priorityValidation: { isValid: true, priority: 0 }
  }))

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value

    // Allow empty input - no validation message for empty fields
    if (inputValue === '') {
      const newState = {
        displayValue: '',
        numericValue: 0,
        validation: { isValid: true }, // Always valid for empty fields
        priorityValidation: {
          isValid: true,
          priority: 0
          // No message for empty fields - completely removed required field validation
        }
      }
      setState(newState)
      onValueChange?.(0)
      return
    }

    // Process the input with priority validation if enabled
    if (usePriorityValidation) {
      const result = processInputChangeWithPriority(inputValue, currency, exchangeRate, availableBalance, isRequired)

      const newState = {
        displayValue: result.formattedValue,
        numericValue: result.numericValue,
        validation: result.validation,
        priorityValidation: result.priorityValidation
      }

      setState(newState)
      onValueChange?.(result.numericValue)
    } else {
      // Legacy processing
      const result = processInputChange(inputValue, currency, exchangeRate, availableBalance)

      const newState = {
        displayValue: result.formattedValue,
        numericValue: result.numericValue,
        validation: result.validation,
        priorityValidation: { isValid: result.validation.isValid, priority: 0 }
      }

      setState(newState)
      onValueChange?.(result.numericValue)
    }
  }, [currency, exchangeRate, onValueChange, availableBalance, isRequired, usePriorityValidation])

  const setValue = useCallback((value: number) => {
    const newState = {
      displayValue: value > 0 ? formatPortugueseInput(value) : '',
      numericValue: value,
      validation: { isValid: true },
      priorityValidation: { isValid: true, priority: 0 }
    }
    setState(newState)
  }, [])

  const setDisplayValue = useCallback((displayValue: string) => {
    const numericValue = parsePortugueseNumber(displayValue)

    if (usePriorityValidation) {
      const result = processInputChangeWithPriority(displayValue, currency, exchangeRate, availableBalance, isRequired)

      const newState = {
        displayValue: result.formattedValue,
        numericValue: result.numericValue,
        validation: result.validation,
        priorityValidation: result.priorityValidation
      }

      setState(newState)
    } else {
      const result = processInputChange(displayValue, currency, exchangeRate, availableBalance)

      const newState = {
        displayValue: result.formattedValue,
        numericValue: result.numericValue,
        validation: result.validation,
        priorityValidation: { isValid: result.validation.isValid, priority: 0 }
      }

      setState(newState)
    }
  }, [currency, exchangeRate, availableBalance, isRequired, usePriorityValidation])

  return {
    ...state,
    handleInputChange,
    setValue,
    setDisplayValue
  }
}
