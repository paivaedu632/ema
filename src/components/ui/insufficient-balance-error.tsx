'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { formatInsufficientBalanceMessage, type Currency } from '@/utils/insufficient-balance-utils'

interface InsufficientBalanceErrorProps {
  currency: Currency
  className?: string
}

/**
 * Reusable component for displaying insufficient balance error with deposit button
 * Follows ema design system and validation patterns
 */
export function InsufficientBalanceError({ 
  currency, 
  className = '' 
}: InsufficientBalanceErrorProps) {
  const router = useRouter()
  const { message, buttonText, route } = formatInsufficientBalanceMessage(currency)

  const handleDepositClick = () => {
    router.push(route)
  }

  return (
    <div className={`form-error-ema ${className}`}>
      {message}{' '}
      <button
        type="button"
        onClick={handleDepositClick}
        className="text-red-700 underline hover:text-red-800 font-medium"
      >
        {buttonText}
      </button>
    </div>
  )
}
