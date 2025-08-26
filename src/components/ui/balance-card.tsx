'use client'

import React from 'react'

interface BalanceCardProps {
  type: string
  currency: string
  amount: string
  flag: React.ReactNode
  onClick?: () => void
  className?: string
}

export function BalanceCard({
  type,
  currency,
  amount,
  flag,
  onClick,
  className = ""
}: BalanceCardProps) {
  const isClickable = !!onClick
  const Component = isClickable ? 'button' : 'div'

  // Format amount with Portuguese locale
  const formatAmount = (amount: string, currency: string) => {
    const numericAmount = parseFloat(amount)
    if (currency === 'AOA') {
      return numericAmount.toLocaleString('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    } else {
      return numericAmount.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  }

  return (
    <Component
      onClick={onClick}
      className={`
        w-full bg-white rounded-xl border border-gray-200 p-5 text-left
        shadow-sm hover:shadow-md transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:border-gray-300' : ''}
        ${className}
      `}
    >
      <div className="space-y-4">
        {/* Currency Header with Flag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {flag}
            <h3 className="text-lg font-semibold text-gray-900">{currency}</h3>
          </div>
        </div>

        {/* Account Type */}
        <div>
          <p className="text-sm text-gray-600 mb-1">{type}</p>
        </div>

        {/* Balance Amount */}
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(amount, currency)}
          </p>
        </div>
      </div>
    </Component>
  )
}
