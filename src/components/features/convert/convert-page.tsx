'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftRight,
  ArrowLeft,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AmountInput } from '@/components/forms/amount-input'
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from '@/components/ui/fixed-bottom-action'


export default function ConvertPage() {
  const router = useRouter()
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'AOA'>('EUR')
  const [toCurrency, setToCurrency] = useState<'EUR' | 'AOA'>('AOA')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)

  // Mock exchange rate (1 EUR = 1252 AOA)
  const baseEurToAoaRate = 1252

  // Calculate conversion rate based on currency pair
  const getConversionRate = (from: string, to: string) => {
    if (from === 'EUR' && to === 'AOA') return baseEurToAoaRate
    if (from === 'AOA' && to === 'EUR') return 1 / baseEurToAoaRate
    return 1 // Same currency
  }

  // Mock user balances
  const userBalances = {
    EUR: 1250.50,
    AOA: 1250000
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)

    // Auto-calculate receive amount for auto mode
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = numValue * rate
      setToAmount(converted.toFixed(toCurrency === 'EUR' ? 6 : 0))
    }
  }

  const handleToAmountChange = (value: string) => {
    setToAmount(value)

    // Auto-calculate convert amount for auto mode (bidirectional)
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const rate = getConversionRate(toCurrency, fromCurrency)
      const converted = numValue * rate
      setFromAmount(converted.toFixed(fromCurrency === 'EUR' ? 6 : 0))
    }
    // In manual mode, don't auto-calculate - preserve user input
  }

  const handleSwapCurrencies = () => {
    const newFromCurrency = toCurrency
    const newToCurrency = fromCurrency
    setFromCurrency(newFromCurrency)
    setToCurrency(newToCurrency)

    // Clear amounts and recalculate
    setFromAmount('')
    setToAmount('')
  }

  const handleBack = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('convert')
    } else {
      router.back()
    }
  }

  const handleConvert = () => {
    setCurrentStep('confirm')
  }

  const handleConfirmConvert = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    setCurrentStep('success')
  }

  const availableBalance = userBalances[fromCurrency]
  const fromAmountNum = parseFloat(fromAmount) || 0
  const isInsufficientBalance = fromAmountNum > availableBalance

  // Handle exchange type change
  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)

    if (type === 'auto' && fromAmount) {
      // Recalculate with market rate when switching to auto
      const numValue = parseFloat(fromAmount) || 0
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = numValue * rate
      setToAmount(converted.toFixed(toCurrency === 'EUR' ? 6 : 0))
    }
    // In manual mode, preserve existing values - don't clear or change anything
  }



  // Success page
  if (currentStep === 'success') {
    const finalToAmount = exchangeType === 'auto'
      ? (parseFloat(fromAmount) * marketRate).toFixed(fromCurrency === 'EUR' ? 0 : 6)
      : toAmount

    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
          <Card>
            <CardContent className="p-8 text-center space-y-6">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Conversão Realizada!</h1>
                <p className="text-gray-600">Sua conversão foi processada com sucesso</p>
              </div>

              {/* Conversion Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="text-sm text-gray-600">Você converteu</div>
                <div className="text-lg font-semibold">{fromAmount} {fromCurrency} → {finalToAmount} {toCurrency}</div>
                <div className="text-xs text-gray-500">Taxa: 1 {fromCurrency} = {marketRate.toLocaleString()} {toCurrency}</div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setCurrentStep('convert')
                    setFromAmount('')
                    setToAmount('')
                  }}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
                  size="lg"
                >
                  Nova Conversão
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboards')}
                  className="w-full"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (currentStep === 'convert') {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />
        <div className="space-y-2">
          {/* From Currency */}
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">
              Você converte
            </Label>
            <AmountInput
              amount={fromAmount}
              currency={fromCurrency}
              onAmountChange={handleFromAmountChange}
              onCurrencyChange={(currency) => {
                setFromCurrency(currency as 'EUR' | 'AOA')
                // Auto-swap the other currency
                setToCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
              }}
              availableCurrencies={[
                { code: 'EUR', flag: 'eu' },
                { code: 'AOA', flag: 'ao' }
              ]}
            />
            <div className="text-sm text-gray-500">
              Disponível: {formatCurrency(availableBalance, fromCurrency)}
            </div>
            {isInsufficientBalance && (
              <p className="text-sm text-red-600">Saldo insuficiente</p>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapCurrencies}
              className="rounded-full p-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">
              Você recebe
            </Label>
            <AmountInput
              amount={toAmount}
              currency={toCurrency}
              onAmountChange={handleToAmountChange}
              onCurrencyChange={(currency) => {
                setToCurrency(currency as 'EUR' | 'AOA')
                // Auto-swap the other currency to prevent same currency selection
                if (currency === fromCurrency) {
                  setFromCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
                }
              }}
              availableCurrencies={[
                { code: 'EUR', flag: 'eu' },
                { code: 'AOA', flag: 'ao' }
              ]}
              disabled={false} // Always enabled for bidirectional editing
            />
          </div>

          {/* Exchange Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Tipo de câmbio</Label>

            {/* Auto Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                exchangeType === 'auto' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleExchangeTypeChange('auto')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 mb-1">Automático</div>
                  <div className="text-sm text-gray-600">
                    Você recebe {fromAmount ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0) : '0'} {toCurrency} agora
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  exchangeType === 'auto' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {exchangeType === 'auto' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                exchangeType === 'manual' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleExchangeTypeChange('manual')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 mb-1">Manual</div>
                  <div className="text-sm text-gray-600">
                    Você recebe {toAmount || '0'} {toCurrency} quando encontrarmos um comprador
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  exchangeType === 'manual' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {exchangeType === 'manual' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Details Section */}
          <div className="border border-gray-300 rounded-lg p-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Taxa de câmbio:</span>
              <span className="font-medium text-black">
                1 {fromCurrency} = {getConversionRate(fromCurrency, toCurrency).toLocaleString(undefined, {
                  minimumFractionDigits: fromCurrency === 'AOA' ? 6 : 0,
                  maximumFractionDigits: fromCurrency === 'AOA' ? 6 : 0
                })} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium text-black">{exchangeType === 'auto' ? 'Automático' : 'Manual'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tempo estimado:</span>
              <span className="font-medium text-black">{exchangeType === 'auto' ? 'Segundos' : 'Até encontrarmos um comprador'}</span>
            </div>
            {fromAmount && (
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-600">Você receberá:</span>
                <span className="font-bold text-black">
                  {exchangeType === 'auto'
                    ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
                    : toAmount || '0'
                  } {toCurrency}
                </span>
              </div>
            )}
          </div>
        </div>
          {/* Desktop Button */}
          <div className="hidden md:block mt-6">
            <Button
              onClick={handleConvert}
              disabled={!fromAmount || (exchangeType === 'manual' && !toAmount) || isInsufficientBalance || isLoading}
              className="primary-action-button"
            >
              Continuar
            </Button>
          </div>
        </main>

        {/* Mobile Fixed Bottom Button */}
        <div className="md:hidden">
          <FixedBottomAction
            primaryAction={{
              label: "Continuar",
              onClick: handleConvert,
              disabled: !fromAmount || (exchangeType === 'manual' && !toAmount) || isInsufficientBalance || isLoading
            }}
          />
        </div>
      </div>
    )
  }

  if (currentStep === 'confirm') {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Confirmar conversão"
            onBack={handleBack}
          />

          {/* Transaction Details - Matching Convert Page Style */}
          <div className="border border-gray-300 rounded-lg p-2 space-y-1 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Você converte:</span>
              <span className="font-bold text-black">{fromAmount} {fromCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Taxa de câmbio:</span>
              <span className="font-medium text-black">
                1 {fromCurrency} = {getConversionRate(fromCurrency, toCurrency).toLocaleString(undefined, {
                  minimumFractionDigits: fromCurrency === 'AOA' ? 6 : 0,
                  maximumFractionDigits: fromCurrency === 'AOA' ? 6 : 0
                })} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium text-black">{exchangeType === 'auto' ? 'Automático' : 'Manual'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tempo estimado:</span>
              <span className="font-medium text-black">{exchangeType === 'auto' ? 'Segundos' : 'Até encontrarmos um comprador'}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-600">Você receberá:</span>
              <span className="font-bold text-black">
                {exchangeType === 'auto'
                  ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
                  : toAmount || '0'
                } {toCurrency}
              </span>
            </div>
          </div>

          {/* Warning - Matching Convert Page Style */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-gray-900">Atenção:</p>
            <p className="text-sm text-gray-600">
              {exchangeType === 'auto'
                ? 'A conversão será processada imediatamente com a taxa atual do mercado.'
                : 'Sua conversão será processada quando encontrarmos a taxa desejada no mercado.'
              }
            </p>
          </div>
          {/* Desktop Button */}
          <div className="hidden md:block mt-6">
            <Button
              onClick={handleConfirmConvert}
              disabled={isLoading}
              className="primary-action-button"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </div>
        </main>

        {/* Mobile Fixed Bottom Button */}
        <div className="md:hidden">
          <FixedBottomAction
            primaryAction={{
              label: isLoading ? "Processando..." : "Confirmar",
              onClick: handleConfirmConvert,
              disabled: isLoading
            }}
          />
        </div>
      </div>
    )
  }

  // Success step - redirect to success page
  if (currentStep === 'success') {
    router.push('/convert/success')
    return null
  }

  return null
}


