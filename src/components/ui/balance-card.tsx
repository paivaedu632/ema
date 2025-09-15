'use client'

import React from 'react'
import { formatAmountForInput, type Currency } from '@/lib/utils'
import { FlagIcon } from '@/components/ui/flag-icon'


interface WalletBalance {
  currency: string
  available_balance: number
  reserved_balance: number
}

interface BalanceCardProps {
  type: string
  currency: string
  amount: string
  flag: React.ReactNode
  onClick?: () => void
  className?: string
}

interface ConsolidatedBalanceCardProps {
  walletBalances: WalletBalance[]
  onClick?: () => void
  className?: string
}

// Legacy BalanceCard component for backward compatibility
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
        flex-shrink-0 w-52 bg-gray-100 text-gray-900 rounded-xl p-6 text-left
        hover:bg-gray-200 transition-all duration-200 shadow-sm border border-gray-200
        ${isClickable ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="space-y-3">
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
            {formatAmountForInput(amount, currency as Currency)}
          </p>
        </div>
      </div>
    </Component>
  )
}

// New consolidated balance card matching the provided design
export function ConsolidatedBalanceCard({
  walletBalances,
  onClick,
  className = "",
  isBalanceVisible = true
}: ConsolidatedBalanceCardProps & { isBalanceVisible?: boolean }) {
  const isClickable = !!onClick
  const Component = isClickable ? 'button' : 'div'

  const formatBalance = (amount: number, currency: string) => {
    if (!isBalanceVisible) {
      return '••••••'
    }
    return formatAmountForInput(amount.toFixed(2), currency as Currency)
  }

  const formatReservedBalance = (amount: number, currency: string) => {
    if (!isBalanceVisible) {
      return '••••••'
    }
    return `${amount.toFixed(2)} ${currency}`
  }

  // Get EUR and AOA balances
  const eurBalance = walletBalances.find(w => w.currency === 'EUR')
  const aoaBalance = walletBalances.find(w => w.currency === 'AOA')

  return (
    <Component
      onClick={onClick}
      className={`
        flex-shrink-0 w-full max-w-md bg-gray-100 text-gray-900 rounded-2xl p-6 text-left
        border-2 border-transparent transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:bg-gray-200' : ''}
        ${className}
      `}
    >
      <div className="space-y-4">
        {/* EUR Balance */}
        {eurBalance && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FlagIcon countryCode="eu" size="xl" alt="EUR flag" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Euro</p>
                <p className="text-sm text-gray-600">Reservado</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">
                {formatBalance(eurBalance.available_balance, 'EUR')}
              </p>
              <p className="text-sm text-gray-600">
                {formatReservedBalance(eurBalance.reserved_balance, 'EUR')}
              </p>
            </div>
          </div>
        )}

        {/* AOA Balance */}
        {aoaBalance && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FlagIcon countryCode="ao" size="xl" alt="Angola flag" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Kwanza</p>
                <p className="text-sm text-gray-600">Reservado</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">
                {formatBalance(aoaBalance.available_balance, 'AOA')}
              </p>
              <p className="text-sm text-gray-600">
                {formatReservedBalance(aoaBalance.reserved_balance, 'AOA')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Component>
  )
}
