'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlagIcon } from '@/components/ui/flag-icon'

export type BalanceType = 'available' | 'reserved'
export type Currency = 'AOA' | 'EUR'

export interface BalanceOption {
  value: string
  label: string
  type: BalanceType
  currency: Currency
}

interface BalanceSelectorProps {
  currency: Currency
  balanceType: BalanceType
  onSelectionChange: (currency: Currency, balanceType: BalanceType) => void
  className?: string
}

const balanceOptions: Record<Currency, BalanceOption[]> = {
  AOA: [
    { value: 'aoa-available', label: 'Saldo AOA', type: 'available', currency: 'AOA' },
    { value: 'aoa-reserved', label: 'Reservado AOA', type: 'reserved', currency: 'AOA' }
  ],
  EUR: [
    { value: 'eur-available', label: 'Saldo EUR', type: 'available', currency: 'EUR' },
    { value: 'eur-reserved', label: 'Reservado EUR', type: 'reserved', currency: 'EUR' }
  ]
}

export function BalanceSelector({
  currency,
  balanceType,
  onSelectionChange,
  className = ""
}: BalanceSelectorProps) {
  const currentValue = `${currency.toLowerCase()}-${balanceType}`
  const allOptions = [...balanceOptions.AOA, ...balanceOptions.EUR]
  
  const handleValueChange = (value: string) => {
    const option = allOptions.find(opt => opt.value === value)
    if (option) {
      onSelectionChange(option.currency, option.type)
    }
  }

  const getFlagCode = (currency: Currency): string => {
    return currency === 'AOA' ? 'ao' : 'eu'
  }

  const currentOption = allOptions.find(opt => opt.value === currentValue)
  const currentLabel = currentOption?.label || 'Saldo'

  return (
    <div className={`${className}`}>
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="balance-selector">
          <SelectValue>
            <div className="currency-selector-container">
              <FlagIcon countryCode={getFlagCode(currency)} className="flag-icon-currency" />
              <span>{currentLabel}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="currency-selector-container">
                <FlagIcon countryCode={getFlagCode(option.currency)} className="flag-icon-currency" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
