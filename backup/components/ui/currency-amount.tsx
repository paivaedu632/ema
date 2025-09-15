'use client'

import React from 'react'

interface CurrencyAmountProps {
  amount: string | number
  currency: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function CurrencyAmount({
  amount,
  currency,
  size = 'medium',
  className = ""
}: CurrencyAmountProps) {
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base font-medium',
    large: 'value-large'
  }

  return (
    <span className={`${sizeClasses[size]} text-gray-900 ${className}`}>
      {amount} {currency}
    </span>
  )
}
