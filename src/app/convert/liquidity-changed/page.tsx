'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LiquidityChanged } from '@/components/features/convert/liquidity-changed'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function LiquidityChangedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract parameters from URL
  const fromAmount = parseFloat(searchParams.get('fromAmount') || '0')
  const fromCurrency = searchParams.get('fromCurrency') as 'EUR' | 'AOA'
  const toCurrency = searchParams.get('toCurrency') as 'EUR' | 'AOA'
  const originalExpectedAmount = parseFloat(searchParams.get('originalExpectedAmount') || '0')
  const currentAvailableAmount = parseFloat(searchParams.get('currentAvailableAmount') || '0')
  const currentRate = parseFloat(searchParams.get('currentRate') || '0')

  useEffect(() => {
    // Validate required parameters
    if (!fromAmount || !fromCurrency || !toCurrency || !originalExpectedAmount || !currentAvailableAmount) {
      setError('Parâmetros inválidos. Redirecionando...')
      setTimeout(() => {
        router.push('/convert')
      }, 2000)
      return
    }

    // Validate currency values
    if (!['EUR', 'AOA'].includes(fromCurrency) || !['EUR', 'AOA'].includes(toCurrency)) {
      setError('Moedas inválidas. Redirecionando...')
      setTimeout(() => {
        router.push('/convert')
      }, 2000)
      return
    }

    // Validate amounts
    if (fromAmount <= 0 || originalExpectedAmount <= 0 || currentAvailableAmount <= 0) {
      setError('Valores inválidos. Redirecionando...')
      setTimeout(() => {
        router.push('/convert')
      }, 2000)
      return
    }

    setIsLoading(false)
  }, [fromAmount, fromCurrency, toCurrency, originalExpectedAmount, currentAvailableAmount, router])

  const handleBack = () => {
    // Go back to convert page with original values
    const params = new URLSearchParams({
      fromAmount: fromAmount.toString(),
      fromCurrency,
      toCurrency
    })
    router.push(`/convert?${params}`)
  }

  const handleCancel = () => {
    // Return to convert page without parameters
    router.push('/convert')
  }



  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <LiquidityChanged
        fromAmount={fromAmount}
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        originalExpectedAmount={originalExpectedAmount}
        currentAvailableAmount={currentAvailableAmount}
        currentRate={currentRate}
        onBack={handleBack}
        onCancel={handleCancel}
      />
    </ProtectedRoute>
  )
}
