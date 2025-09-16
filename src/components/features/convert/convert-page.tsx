'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Zap,
  Clock,
  ChevronDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { FlagIcon } from '@/components/ui/flag-icon'
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from '@/components/ui/fixed-bottom-action'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentMarketRate } from '@/hooks/use-api'

// Available currencies - only AOA and EUR
type Currency = 'EUR' | 'AOA'

const currencies: { code: Currency; name: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro', flag: 'eu' },
  { code: 'AOA', name: 'Kwanza', flag: 'ao' },
]

export default function ConvertPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'AOA'>('EUR')
  const [toCurrency, setToCurrency] = useState<'EUR' | 'AOA'>('AOA')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)
  const [sourceComponent, setSourceComponent] = useState<string | null>(null)

  // Get real-time market rate
  const { data: marketRateData, isLoading: isRateLoading } = useCurrentMarketRate(
    fromCurrency,
    toCurrency,
    fromCurrency !== toCurrency
  ) as {
    data?: {
      baseCurrency: string
      quoteCurrency: string
      rate: number
      source: string
      lastUpdated: string
    }
    isLoading: boolean
  }

  // Calculate conversion rate based on currency pair
  const getConversionRate = (from: string, to: string) => {
    if (from === to) return 1

    // Use real market rate if available
    if (marketRateData?.rate) {
      return marketRateData.rate
    }

    // Fallback to hardcoded rates
    if (from === 'EUR' && to === 'AOA') return 1252
    if (from === 'AOA' && to === 'EUR') return 1 / 1252
    return 1
  }

  // Mock user balances
  const userBalances = {
    EUR: 1250.50,
    AOA: 1250000
  }

  // Handle URL parameters from other convert components
  useEffect(() => {
    const step = searchParams.get('step')
    const fromAmountParam = searchParams.get('fromAmount')
    const fromCurrencyParam = searchParams.get('fromCurrency') as Currency
    const toAmountParam = searchParams.get('toAmount')
    const toCurrencyParam = searchParams.get('toCurrency') as Currency
    const exchangeTypeParam = searchParams.get('exchangeType') as 'auto' | 'manual'
    const source = searchParams.get('source')

    if (step === 'confirm' && fromAmountParam && fromCurrencyParam && toCurrencyParam) {
      // Set form data from URL parameters
      setFromAmount(fromAmountParam)
      setFromCurrency(fromCurrencyParam)
      setToAmount(toAmountParam || '')
      setToCurrency(toCurrencyParam)
      setExchangeType(exchangeTypeParam || 'auto')
      setSourceComponent(source)
      setCurrentStep('confirm')

      // Clean up URL parameters after setting state
      const newUrl = new URL(window.location.href)
      newUrl.search = ''
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

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

  const handleFromCurrencyChange = (currency: Currency) => {
    setFromCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === toCurrency) {
      setToCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromAmount) {
      handleFromAmountChange(fromAmount)
    }
  }

  const handleToCurrencyChange = (currency: Currency) => {
    setToCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === fromCurrency) {
      setFromCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromAmount) {
      handleFromAmountChange(fromAmount)
    }
  }

  const handleBack = () => {
    if (currentStep === 'confirm') {
      // If we came from another convert component, go back to that component
      if (sourceComponent === 'convert-2') {
        router.push('/convert-2')
      } else if (sourceComponent === 'convert-3') {
        router.push('/convert-3')
      } else {
        // Otherwise, go back to the convert step within this component
        setCurrentStep('convert')
      }
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
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />
        <div className="space-y-2">
          {/* From Currency */}
          <div className="space-y-1">
            <Label className="text-sm font-bold text-gray-700">
              Você converte
            </Label>
            <div className="bg-white rounded-lg border border-black p-4 focus-within:border-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="text"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-left text-2xl font-semibold bg-transparent border-0 outline-none focus:ring-0 text-gray-900 placeholder-gray-400 min-w-0"
                  />

                  <div className="flex items-center gap-2">
                    <FlagIcon
                      countryCode={currencies.find(c => c.code === fromCurrency)?.flag || 'eu'}
                      size="lg"
                    />

                    <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{fromCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <FlagIcon countryCode={currency.flag} size="sm" />
                            <span>{currency.code}</span>
                            <span className="text-gray-500 text-sm">- {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm text-black">
              Saldo: {formatCurrency(availableBalance, fromCurrency)}
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
            <Label className="text-sm font-bold text-gray-700">
              Você recebe
            </Label>
            <div className="bg-white rounded-lg border border-black p-4 focus-within:border-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="text"
                    value={toAmount}
                    onChange={(e) => handleToAmountChange(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-left text-2xl font-semibold bg-transparent border-0 outline-none focus:ring-0 text-gray-900 placeholder-gray-400 min-w-0"
                  />

                  <div className="flex items-center gap-2">
                    <FlagIcon
                      countryCode={currencies.find(c => c.code === toCurrency)?.flag || 'ao'}
                      size="lg"
                    />

                    <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{toCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <FlagIcon countryCode={currency.flag} size="sm" />
                            <span>{currency.code}</span>
                            <span className="text-gray-500 text-sm">- {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Rate Warning */}
            {exchangeType === 'manual' && fromAmount && parseFloat(fromAmount) > 0 && (() => {
              const marketRate = getConversionRate(fromCurrency, toCurrency)
              const fromAmountNum = parseFloat(fromAmount)
              const marketAmount = fromAmountNum * marketRate

              // Calculate 20% margin range
              const lowerBound = marketAmount * 0.8  // 20% below market
              const upperBound = marketAmount * 1.2  // 20% above market

              return (
                <div className="mt-2 text-sm">
                  <span className="text-red-600">
                    Recomendado: {formatCurrency(lowerBound, toCurrency)}-{formatCurrency(upperBound, toCurrency)}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Exchange Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">Tipo de câmbio</Label>

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
                    Você recebe <span className="font-bold">{fromAmount ? formatCurrency(parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency), toCurrency) : formatCurrency(0, toCurrency)}</span> agora
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
                    {exchangeType === 'manual' && toAmount && parseFloat(toAmount) > 0
                      ? <>Você recebe <span className="font-bold">{formatCurrency(parseFloat(toAmount), toCurrency)}</span> quando encontrarmos o câmbio que você quer</>
                      : 'Escolha quanto você quer receber'
                    }
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
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Tudo certo?"
            onBack={handleBack}
          />



          {/* Currency Exchange Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              {/* From Currency */}
              <div className="flex flex-col items-center text-center">
                <FlagIcon
                  countryCode={fromCurrency === 'EUR' ? 'eu' : 'ao'}
                  size="xl"
                />
                <div className="text-sm text-gray-500 mt-2">Converter</div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(parseFloat(fromAmount) || 0, fromCurrency)}
                </div>
              </div>

              {/* Arrow */}
              <div className="mx-4">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>

              {/* To Currency */}
              <div className="flex flex-col items-center text-center">
                <FlagIcon
                  countryCode={toCurrency === 'EUR' ? 'eu' : 'ao'}
                  size="xl"
                />
                <div className="text-sm text-gray-500 mt-2">Para</div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(
                    exchangeType === 'auto'
                      ? parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)
                      : parseFloat(toAmount) || 0,
                    toCurrency
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details - Wise Style */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Você está convertendo</span>
              <span className="font-medium text-gray-900">{formatCurrency(parseFloat(fromAmount) || 0, fromCurrency)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Câmbio</span>
              <span className="font-medium text-gray-900">
                1 {fromCurrency} = {formatCurrency(getConversionRate(fromCurrency, toCurrency), toCurrency)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Você recebe total</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(
                    exchangeType === 'auto'
                      ? parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)
                      : parseFloat(toAmount) || 0,
                    toCurrency
                  )}
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


