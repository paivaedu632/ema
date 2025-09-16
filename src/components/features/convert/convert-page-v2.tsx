'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ArrowUpDown,
  ArrowDown,
  ChevronDown,
  Zap,
  Clock
} from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import { useCurrentMarketRate } from '@/hooks/use-api'
import { useCurrencyInput } from '@/hooks/use-currency-input'

// Available currencies - only AOA and EUR
type Currency = 'EUR' | 'AOA'

const currencies: { code: Currency; name: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro', flag: 'eu' },
  { code: 'AOA', name: 'Kwanza', flag: 'ao' },
]

export default function ConvertPageV2() {
  const router = useRouter()
  const [fromCurrency, setFromCurrency] = useState<Currency>('EUR')
  const [toCurrency, setToCurrency] = useState<Currency>('AOA')

  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)

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
  const getConversionRate = (from: Currency, to: Currency) => {
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
  const userBalances: Record<Currency, number> = {
    EUR: 1250.50,
    AOA: 1250000
  }

  // Currency input hooks with validation
  const fromInput = useCurrencyInput({
    currency: fromCurrency,
    exchangeRate: getConversionRate('EUR', 'AOA'),
    onValueChange: (numericValue) => {
      if (exchangeType === 'auto') {
        const rate = getConversionRate(fromCurrency, toCurrency)
        const converted = numericValue * rate
        toInput.setValue(converted)
      }
    }
  })

  const toInput = useCurrencyInput({
    currency: toCurrency,
    exchangeRate: getConversionRate('EUR', 'AOA'),
    onValueChange: (numericValue) => {
      if (exchangeType === 'auto') {
        const rate = getConversionRate(toCurrency, fromCurrency)
        const converted = numericValue * rate
        fromInput.setValue(converted)
      }
    }
  })

  const handleSwapCurrencies = () => {
    const newFromCurrency = toCurrency
    const newToCurrency = fromCurrency
    setFromCurrency(newFromCurrency)
    setToCurrency(newToCurrency)

    // Swap the input values
    const tempFromValue = fromInput.numericValue
    const tempToValue = toInput.numericValue

    fromInput.setValue(tempToValue)
    toInput.setValue(tempFromValue)
  }

  const handleFromCurrencyChange = (currency: Currency) => {
    setFromCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === toCurrency) {
      setToCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromInput.numericValue > 0) {
      const rate = getConversionRate(currency, toCurrency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }

  const handleToCurrencyChange = (currency: Currency) => {
    setToCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === fromCurrency) {
      setFromCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromInput.numericValue > 0) {
      const rate = getConversionRate(fromCurrency, currency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }

  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)

    // Recalculate amounts if switching to auto
    if (type === 'auto' && fromInput.numericValue > 0) {
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }

  // Recalculate when market rate changes
  useEffect(() => {
    if (exchangeType === 'auto' && fromInput.numericValue > 0 && marketRateData?.rate) {
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }, [marketRateData?.rate, fromCurrency, toCurrency, exchangeType, fromInput.numericValue])

  const handleBack = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('convert')
    } else {
      router.back()
    }
  }

  const handleConvert = () => {
    // Redirect to main convert component with confirmation step and form data
    const params = new URLSearchParams({
      step: 'confirm',
      fromAmount: fromInput.numericValue.toString(),
      fromCurrency: fromCurrency,
      toAmount: toInput.numericValue.toString(),
      toCurrency: toCurrency,
      exchangeType: exchangeType,
      source: 'convert-3' // Track which component initiated the conversion
    })

    router.push(`/convert?${params.toString()}`)
  }

  const handleConfirmConvert = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    setCurrentStep('success')
  }

  // Success step - redirect to success page with conversion data
  if (currentStep === 'success') {
    const finalAmount = exchangeType === 'auto'
      ? (fromInput.numericValue * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
      : toInput.numericValue.toFixed(toCurrency === 'EUR' ? 6 : 0)

    const params = new URLSearchParams({
      type: exchangeType,
      amount: finalAmount,
      currency: toCurrency,
      fromAmount: fromInput.numericValue.toString(),
      fromCurrency: fromCurrency
    })

    router.push(`/convert/success?${params.toString()}`)
    return null
  }

  const currentRate = getConversionRate(fromCurrency, toCurrency)
  const isValidAmount = fromInput.numericValue > 0

  if (currentStep === 'convert') {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />

          <div className="relative mt-6">
            {/* From Currency Card */}
            <div className="bg-white rounded-2xl border border-black p-6 shadow-sm mb-0">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm text-gray-500 font-bold">Converter</Label>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Saldo {userBalances[fromCurrency].toLocaleString(undefined, {
                      minimumFractionDigits: fromCurrency === 'AOA' ? 0 : 2,
                      maximumFractionDigits: fromCurrency === 'AOA' ? 0 : 2
                    })} {fromCurrency}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 min-w-0">
                <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                  <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        <FlagIcon
                          countryCode={currencies.find(c => c.code === fromCurrency)?.flag || 'eu'}
                          size="lg"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{fromCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
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

                <input
                  type="text"
                  value={fromInput.displayValue}
                  onChange={fromInput.handleInputChange}
                  placeholder="0"
                  className="text-right text-2xl md:text-2xl font-semibold bg-transparent outline-none flex-1 min-w-0 text-gray-900 placeholder-gray-400 overflow-hidden"
                />
              </div>
            </div>
            {!fromInput.validation.isValid && (
              <div className="text-sm text-red-500 mt-1 text-center">
                {fromInput.validation.error}
              </div>
            )}

            {/* Swap Button - Overlapping the cards */}
            <div className="flex justify-center relative z-20 -my-4">
              <button
                onClick={handleSwapCurrencies}
                className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* To Currency Card */}
            <div className="bg-white rounded-2xl border border-black p-6 shadow-sm mt-0">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm text-gray-500 font-bold">Para</Label>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Saldo {userBalances[toCurrency].toLocaleString(undefined, {
                      minimumFractionDigits: toCurrency === 'AOA' ? 0 : 2,
                      maximumFractionDigits: toCurrency === 'AOA' ? 0 : 2
                    })} {toCurrency}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 min-w-0">
                <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                  <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        <FlagIcon
                          countryCode={currencies.find(c => c.code === toCurrency)?.flag || 'ao'}
                          size="lg"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{toCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
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

                <input
                  type="text"
                  value={toInput.displayValue}
                  onChange={toInput.handleInputChange}
                  placeholder="0"
                  className="text-right text-2xl md:text-2xl font-semibold bg-transparent outline-none flex-1 min-w-0 text-gray-900 placeholder-gray-400 overflow-hidden"
                />
              </div>
              {!toInput.validation.isValid && (
                <div className="text-sm text-red-500 mt-1 text-center">
                  {toInput.validation.error}
                </div>
              )}

              {/* Market Rate Warning */}
              {exchangeType === 'manual' && fromInput.numericValue > 0 && (() => {
                const marketRate = getConversionRate(fromCurrency, toCurrency)
                const marketAmount = fromInput.numericValue * marketRate

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
            <div className="space-y-2 mt-6">
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
                      Você recebe <span className="font-bold">{fromInput.numericValue > 0 ? formatCurrency(fromInput.numericValue * getConversionRate(fromCurrency, toCurrency), toCurrency) : formatCurrency(0, toCurrency)}</span> agora
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
                      {exchangeType === 'manual' && toInput.numericValue > 0
                        ? <>Você recebe <span className="font-bold">{formatCurrency(toInput.numericValue, toCurrency)}</span> quando encontrarmos o câmbio que você quer</>
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
              disabled={fromInput.numericValue === 0 || (exchangeType === 'manual' && toInput.numericValue === 0) || !fromInput.validation.isValid || !toInput.validation.isValid}
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
              disabled: fromInput.numericValue === 0 || (exchangeType === 'manual' && toInput.numericValue === 0) || !fromInput.validation.isValid || !toInput.validation.isValid
            }}
          />
        </div>
      </div>
    )
  }

  return null
}
