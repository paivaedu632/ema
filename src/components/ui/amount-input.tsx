'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlagIcon } from '@/components/ui/flag-icon'

interface AmountInputProps {
  amount: string
  currency: string
  onAmountChange: (amount: string) => void
  onCurrencyChange: (currency: string) => void
  placeholder?: string
  availableCurrencies?: Array<{ code: string; flag: string }>
  className?: string
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
  className = ""
}: AmountInputProps) {
  const currentCurrency = availableCurrencies.find(c => c.code === currency) || availableCurrencies[0]

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        className="amount-input-standard pr-32"
        placeholder={placeholder}
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <FlagIcon countryCode={currentCurrency.flag} />
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="currency-selector">
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
      </div>
    </div>
  )
}
