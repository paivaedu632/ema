'use client'

import React from 'react'

interface AvailableBalanceProps {
  amount: string
  currency?: string
  label?: string
  className?: string
}

export function AvailableBalance({
  amount,
  currency,
  label = "Seu saldo:",
  className = ""
}: AvailableBalanceProps) {
  const displayAmount = currency ? `${amount} ${currency}` : amount

  return (
    <div className={`mb-3 ${className}`}>
      <p className="label-info">
        {label} <span className="value-secondary">{displayAmount}</span>
      </p>
    </div>
  )
}
