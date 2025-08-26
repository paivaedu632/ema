'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlagIcon } from '@/components/ui/flag-icon'
import { validateAmount, type TransactionType, type Currency } from '@/utils/amount-validation'

interface AmountInputProps {
  amount: string
  currency: string
  onAmountChange: (amount: string) => void
  onCurrencyChange: (currency: string) => void
  placeholder?: string
  availableCurrencies?: Array<{ code: string; flag: string }>
  className?: string
  transactionType?: TransactionType
  showValidation?: boolean
  onValidationChange?: (isValid: boolean, errorMessage?: string) => void
  disabled?: boolean
}

const defaultCurrencies = [
  { code: 'AOA', flag: 'ao' },
  { code: 'EUR', flag: 'eu' }
]

export function AmountInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  placeholder = "0",
  availableCurrencies = defaultCurrencies,
  className = "",
  transactionType,
  showValidation = false,
  onValidationChange,
  disabled = false
}: AmountInputProps) {
  const [errorMessage, setErrorMessage] = useState<string>("")
  const currentCurrency = availableCurrencies.find(c => c.code === currency) || availableCurrencies[0]

  // Validate amount when it changes
  useEffect(() => {
    if (!showValidation || !transactionType || !amount.trim()) {
      setErrorMessage("")
      onValidationChange?.(true)
      return
    }

    const validation = validateAmount(amount, currency as Currency, transactionType)
    setErrorMessage(validation.errorMessage || "")
    onValidationChange?.(validation.isValid, validation.errorMessage)
  }, [amount, currency, transactionType, showValidation, onValidationChange])

  return (
    <div className={`${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className={`amount-input-standard pr-32 ${errorMessage ? 'border-red-500 focus:border-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          disabled={disabled}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 currency-selector-container">
          <FlagIcon countryCode={currentCurrency.flag} className="flag-icon-currency" />
          {availableCurrencies.length === 1 ? (
            // Show static text when only one currency is available
            <div className="currency-selector-static">
              <span className="text-sm font-medium text-gray-900">{currency}</span>
            </div>
          ) : (
            // Show dropdown when multiple currencies are available
            <Select value={currency} onValueChange={onCurrencyChange} disabled={disabled}>
              <SelectTrigger className={`currency-selector ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Error Message */}
      {showValidation && errorMessage && (
        <div className="mt-2">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
