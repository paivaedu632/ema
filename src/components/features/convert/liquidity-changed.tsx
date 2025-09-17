'use client'

import { useState } from 'react'
import { Zap, Clock } from 'lucide-react'
import { usePlaceMarketOrder, usePlaceLimitOrder } from '@/hooks/use-api'
import type { MarketOrderRequest, LimitOrderRequest } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from '@/components/ui/fixed-bottom-action'
import { Button } from '@/components/ui/button'
import { LoadingOverlay } from '@/components/ui/loading-overlay'

interface LiquidityChangedProps {
  // Original order details
  fromAmount: number
  fromCurrency: 'EUR' | 'AOA'
  toCurrency: 'EUR' | 'AOA'
  originalExpectedAmount: number
  
  // Current market conditions
  currentAvailableAmount: number
  currentRate: number

  // Callbacks
  onBack: () => void
  onCancel: () => void
}

export function LiquidityChanged({
  fromAmount,
  fromCurrency,
  toCurrency,
  originalExpectedAmount,
  currentAvailableAmount,
  onBack,
  onCancel
}: LiquidityChangedProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<'convert' | 'wait'>('convert')

  // Order placement hooks
  const placeMarketOrder = usePlaceMarketOrder()
  const placeLimitOrder = usePlaceLimitOrder()

  const handleConvertNow = async () => {
    setIsLoading(true)
    setOrderError(null)

    try {
      // Determine order side based on currency conversion
      const side: 'buy' | 'sell' = fromCurrency === 'EUR' ? 'sell' : 'buy'

      // Place market order with current available liquidity
      const marketOrderData: MarketOrderRequest = {
        side,
        amount: fromAmount,
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
        slippageLimit: 0.05 // 5% slippage limit
      }

      await placeMarketOrder.mutateAsync(marketOrderData)

      // Redirect to original success page with original parameters
      const params = new URLSearchParams({
        type: 'auto',
        amount: currentAvailableAmount.toString(),
        currency: toCurrency
      })
      window.location.href = `/convert/success?${params}`
    } catch (error) {
      console.error('Market order failed:', error)
      
      let errorMessage = 'Falha ao processar a conversão. Tente novamente.'
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          errorMessage = 'Saldo insuficiente para esta conversão.'
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Sessão expirada. Faça login novamente.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.'
        }
      }
      
      setOrderError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWait = async () => {
    setIsLoading(true)
    setOrderError(null)

    try {
      // Determine order side based on currency conversion
      const side: 'buy' | 'sell' = fromCurrency === 'EUR' ? 'sell' : 'buy'

      // Calculate the desired exchange rate from original expected amount
      const desiredRate = originalExpectedAmount / fromAmount

      // Place limit order at the original desired rate
      const limitOrderData: LimitOrderRequest = {
        side,
        amount: fromAmount,
        price: desiredRate,
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency
      }

      await placeLimitOrder.mutateAsync(limitOrderData)

      // Redirect to original success page with original parameters
      const params = new URLSearchParams({
        type: 'manual',
        amount: originalExpectedAmount.toString(),
        currency: toCurrency
      })
      window.location.href = `/convert/success?${params}`
    } catch (error) {
      console.error('Limit order failed:', error)
      
      let errorMessage = 'Falha ao processar a conversão. Tente novamente.'
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          errorMessage = 'Saldo insuficiente para esta conversão.'
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Sessão expirada. Faça login novamente.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.'
        }
      }
      
      setOrderError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (selectedOption === 'convert') {
      await handleConvertNow()
    } else {
      await handleWait()
    }
  }

  return (
    <div className="page-container-white">
      <main className="max-w-md mx-auto px-4 py-6">
        <PageHeader
          title="Converter"
          onBack={onBack}
        />

        <div className="space-y-6">
          {/* Explanation */}
          <div className="text-left">
            <p className="text-gray-600">
              O câmbio mudou enquanto processávamos a sua conversão.
            </p>
          </div>

          {/* Comparison */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Você queria receber:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(originalExpectedAmount, toCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Disponível agora:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(currentAvailableAmount, toCurrency)}
              </span>
            </div>
          </div>

          {/* Options Title */}
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Qual você prefere?</h2>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {/* Convert Now Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                selectedOption === 'convert' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedOption('convert')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 mb-1">Converter agora</div>
                  <div className="text-sm text-gray-600">
                    Recebe: <span className="font-bold">{formatCurrency(currentAvailableAmount, toCurrency)}</span> imediatamente
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedOption === 'convert' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedOption === 'convert' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Wait Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                selectedOption === 'wait' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedOption('wait')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 mb-1">Esperar</div>
                  <div className="text-sm text-gray-600">
                    Recebe: <span className="font-bold">{formatCurrency(originalExpectedAmount, toCurrency)}</span> quando câmbio melhorar
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedOption === 'wait' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedOption === 'wait' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {orderError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{orderError}</p>
            </div>
          )}

          {/* Desktop Buttons */}
          <div className="hidden md:block mt-6 space-y-3">
            <Button
              onClick={handleConfirm}
              className="primary-action-button"
            >
              Confirmar
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Buttons */}
      <div className="md:hidden">
        <FixedBottomAction
          primaryAction={{
            label: "Confirmar",
            onClick: handleConfirm
          }}
          secondaryAction={{
            label: "Cancelar",
            onClick: onCancel
          }}
        />
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} />
    </div>
  )
}
