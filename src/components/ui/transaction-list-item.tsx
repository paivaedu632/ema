'use client'

import React from 'react'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react'
import { formatAmountWithCurrency, type Currency } from '@/lib/utils'

interface TransactionListItemProps {
  id: string
  displayId?: string // New Wise-style transaction ID (EP-2025-XXXXXX)
  type: string
  status: string
  description: string
  amount: string
  currency?: string // Add currency prop for proper formatting
  date: string
  onClick?: (id: string) => void
  className?: string
}

/**
 * Unified transaction list item component for consistent display across EmaPay
 * Used in both dashboard and transactions page for visual consistency
 * Follows EmaPay design system patterns with standardized styling
 */
export function TransactionListItem({
  id,
  displayId,
  type,
  status,
  description,
  amount,
  currency = 'EUR', // Default to EUR if not specified
  date,
  onClick,
  className = ""
}: TransactionListItemProps) {
  
  // Unified transaction icon logic
  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed' || status === 'declined') {
      return <ShoppingBag className="w-5 h-5 text-gray-600" />
    }

    switch (type) {
      case 'receive':
      case 'received':
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />
      case 'send':
      case 'sent':
      case 'withdraw':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />
      case 'buy':
      case 'sell':
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-gray-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  // Unified status display logic
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'failed':
        return <span className="text-red-600">Falhou · </span>
      case 'pending':
        return <span className="text-yellow-600">Pendente · </span>
      case 'declined':
        return <span className="text-red-600">Recusado · </span>
      default:
        return null
    }
  }

  const handleClick = () => {
    if (onClick) {
      // Use display_id for navigation if available, fallback to UUID
      onClick(displayId || id)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full transaction-list-item ${className}`}
      disabled={!onClick}
    >
      {/* Transaction Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
        {getTransactionIcon(type, status)}
      </div>

      {/* Transaction Details */}
      <div className="flex-1 text-left">
        <p className="value-secondary">{description}</p>
        <p className="label-form">
          {getStatusDisplay(status)}
          {date}
        </p>
      </div>

      {/* Transaction Amount */}
      <div className="text-right">
        <p className="value-secondary">
          {formatAmountWithCurrency(amount, currency as Currency)}
        </p>
      </div>
    </button>
  )
}

/**
 * Loading skeleton for transaction list items
 */
export function TransactionListItemSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 p-3 ${className}`}>
      <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
      <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
    </div>
  )
}

/**
 * Empty state for transaction lists
 */
export function TransactionListEmpty({ 
  title = "Nenhuma transação encontrada",
  subtitle = "Suas transações aparecerão aqui",
  className = ""
}: { 
  title?: string
  subtitle?: string
  className?: string 
}) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <p className="text-gray-500 text-sm">{title}</p>
      {subtitle && (
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      )}
    </div>
  )
}
