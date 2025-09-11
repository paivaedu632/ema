'use client'

import React, { useState } from 'react'
import { BalanceSelector, type BalanceType, type Currency } from './balance-selector'

interface WalletBalance {
  currency: Currency
  available_balance: number
  reserved_balance: number
}

interface EnhancedBalanceCardProps {
  wallet: WalletBalance
  onClick?: () => void
  className?: string
}

export function EnhancedBalanceCard({
  wallet,
  onClick,
  className = ""
}: EnhancedBalanceCardProps) {
  const [selectedBalanceType, setSelectedBalanceType] = useState<BalanceType>('available')
  
  const isClickable = !!onClick
  const Component = isClickable ? 'button' : 'div'

  const handleBalanceTypeChange = (currency: Currency, balanceType: BalanceType) => {
    setSelectedBalanceType(balanceType)
  }

  const getDisplayAmount = (): string => {
    const amount = selectedBalanceType === 'available'
      ? wallet.available_balance
      : wallet.reserved_balance
    return amount.toFixed(2)
  }



  return (
    <Component
      onClick={onClick}
      className={`
        flex-shrink-0 w-48 card-balance text-left
        ${isClickable ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}
        ${className}
      `}
    >
      <div className="space-y-2">
        {/* Balance Selector - Replaces static "Carteira AOA" text */}
        <div className="flex items-center">
          <BalanceSelector
            currency={wallet.currency}
            balanceType={selectedBalanceType}
            onSelectionChange={handleBalanceTypeChange}
          />
        </div>

        {/* Amount Display - Reduced spacing */}
        <div className="pt-1">
          <p className="value-large">{getDisplayAmount()} {wallet.currency}</p>
        </div>
      </div>
    </Component>
  )
}
