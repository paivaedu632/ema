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
import { FlagIcon } from '@/components/ui/flag-icon'
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



  // Success step - redirect to success page with conversion data
  if (currentStep === 'success') {
    const finalAmount = exchangeType === 'auto'
      ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
      : toAmount || '0'

    const params = new URLSearchParams({
      type: exchangeType,
      amount: finalAmount,
      currency: toCurrency,
      fromAmount: fromAmount,
      fromCurrency: fromCurrency
    })

    router.push(`/convert/success?${params.toString()}`)
    return null
  }

  if (currentStep === 'convert') {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />
        <div className="space-y-6">
          {/* Currency Conversion Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            {/* From Currency */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-800">
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
              <div className="text-sm text-gray-500 px-1">
                Disponível: {formatCurrency(availableBalance, fromCurrency)}
              </div>
              {isInsufficientBalance && (
                <p className="text-sm text-red-600 px-1">Saldo insuficiente</p>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapCurrencies}
                className="rounded-full p-3 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </Button>
            </div>

            {/* To Currency */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-800">
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
          </div>

          {/* Exchange Type Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <Label className="text-sm font-semibold text-gray-800">Tipo de câmbio</Label>

            {/* Auto Option */}
            <div
              className={`border-2 rounded-xl cursor-pointer transition-all duration-200 p-5 ${
                exchangeType === 'auto'
                  ? 'border-black bg-black/5 shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
              }`}
              onClick={() => handleExchangeTypeChange('auto')}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  exchangeType === 'auto' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Automático</div>
                  <div className="text-sm text-gray-600">
                    Você recebe {fromAmount ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0) : '0'} {toCurrency} agora
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
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
              className={`border-2 rounded-xl cursor-pointer transition-all duration-200 p-5 ${
                exchangeType === 'manual'
                  ? 'border-black bg-black/5 shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
              }`}
              onClick={() => handleExchangeTypeChange('manual')}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  exchangeType === 'manual' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Manual</div>
                  <div className="text-sm text-gray-600">
                    {exchangeType === 'manual' && toAmount && parseFloat(toAmount) > 0
                      ? `Você recebe ${toAmount} ${toCurrency} quando encontrarmos o câmbio que você quer`
                      : 'Escolha quanto você quer receber'
                    }
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  exchangeType === 'manual' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {exchangeType === 'manual' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          {fromAmount && parseFloat(fromAmount) > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Taxa atual</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  1 {fromCurrency} = {getConversionRate(fromCurrency, toCurrency).toLocaleString(undefined, {
                    minimumFractionDigits: fromCurrency === 'AOA' ? 6 : 0,
                    maximumFractionDigits: fromCurrency === 'AOA' ? 6 : 0
                  })} {toCurrency}
                </div>
              </div>
            </div>
          )}

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
            title="Está tudo correto?"
            onBack={handleBack}
          />

          {/* Wise-Style Currency Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
            {/* From Currency */}
            <div className="flex items-center space-x-3">
              <FlagIcon
                countryCode={fromCurrency === 'EUR' ? 'eu' : 'ao'}
                size="xl"
              />
              <div>
                <div className="text-sm text-gray-500">De</div>
                <div className="font-medium text-gray-900">{fromCurrency}</div>
              </div>
            </div>

            {/* To Currency */}
            <div className="flex items-center space-x-3">
              <FlagIcon
                countryCode={toCurrency === 'EUR' ? 'eu' : 'ao'}
                size="xl"
              />
              <div>
                <div className="text-sm text-gray-500">Para</div>
                <div className="font-medium text-gray-900">{toCurrency}</div>
              </div>
            </div>
          </div>

          {/* Transaction Details - Wise Style */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Você está convertendo</span>
              <span className="font-medium text-gray-900">{fromAmount} {fromCurrency}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxa de câmbio</span>
              <span className="font-medium text-gray-900">
                1 {fromCurrency} = {getConversionRate(fromCurrency, toCurrency).toLocaleString(undefined, {
                  minimumFractionDigits: fromCurrency === 'AOA' ? 6 : 0,
                  maximumFractionDigits: fromCurrency === 'AOA' ? 6 : 0
                })} {toCurrency}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Você receberá</span>
                <span className="font-bold text-lg text-gray-900">
                  {exchangeType === 'auto'
                    ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
                    : toAmount || '0'
                  } {toCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Processing Info */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              {exchangeType === 'auto'
                ? 'Sua conversão será processada imediatamente com a taxa atual do mercado.'
                : 'Sua conversão será processada quando encontrarmos o câmbio que você quer.'
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

  return null
}


