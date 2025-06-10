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

  return (
    <Component
      onClick={onClick}
      className={`
        flex-shrink-0 w-48 card-balance text-left
        ${isClickable ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}
        ${className}
      `}
    >
      <div className="space-y-6">
        {/* Flag and Account Type */}
        <div className="flex items-center space-x-3">
          {flag}
          <h3 className="heading-card">{type}</h3>
        </div>

        {/* Amount */}
        <div>
          <p className="value-large">{amount} {currency}</p>
        </div>
      </div>
    </Component>
  )
}
