'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface TransactionSummaryProps {
  icon: LucideIcon
  label: string
  amount: string
  fee?: string
  subtitle?: string
  className?: string
}

/**
 * Reusable component for displaying transaction summary information
 * Used in buy/sell flows for "Você recebe", "Você paga", etc.
 * Follows EmaPay design patterns with icon, label, amount, and optional fee
 */
export function TransactionSummary({
  icon: Icon,
  label,
  amount,
  fee,
  subtitle,
  className = ""
}: TransactionSummaryProps) {
  return (
    <div className={`flex items-center py-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-900" />
        </div>
        <div>
          <div className="text-sm text-gray-900">{label}</div>
          <div className="text-base font-bold text-gray-900">{amount}</div>
          {fee && (
            <div className="text-xs text-gray-500">Taxa: {fee}</div>
          )}
          {subtitle && (
            <div className="text-xs text-gray-500">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TransactionSummaryListProps {
  items: Array<{
    icon: LucideIcon
    label: string
    amount: string
    fee?: string
    subtitle?: string
  }>
  className?: string
}

/**
 * Container component for multiple transaction summary items
 * Provides consistent spacing and layout
 */
export function TransactionSummaryList({
  items,
  className = ""
}: TransactionSummaryListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => (
        <TransactionSummary
          key={index}
          icon={item.icon}
          label={item.label}
          amount={item.amount}
          fee={item.fee}
          subtitle={item.subtitle}
        />
      ))}
    </div>
  )
}
