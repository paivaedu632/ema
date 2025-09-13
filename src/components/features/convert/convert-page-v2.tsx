'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ArrowUpDown,
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
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)

  // Mock exchange rate (1 EUR = 1252 AOA)
  const baseEurToAoaRate = 1252

  // Calculate conversion rate based on currency pair
  const getConversionRate = (from: Currency, to: Currency) => {
    if (from === to) return 1
    if (from === 'EUR' && to === 'AOA') return baseEurToAoaRate
    if (from === 'AOA' && to === 'EUR') return 1 / baseEurToAoaRate
    return 1
  }

  // Mock user balances
  const userBalances: Record<Currency, number> = {
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

    // Auto-calculate send amount for auto mode
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const rate = getConversionRate(toCurrency, fromCurrency)
      const converted = numValue * rate
      setFromAmount(converted.toFixed(fromCurrency === 'EUR' ? 6 : 0))
    }
  }

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(tempCurrency)

    // Swap amounts too
    const tempAmount = fromAmount
    setFromAmount(toAmount)
    setToAmount(tempAmount)
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

  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)
    
    // Recalculate amounts if switching to auto
    if (type === 'auto' && fromAmount) {
      handleFromAmountChange(fromAmount)
    }
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

  const currentRate = getConversionRate(fromCurrency, toCurrency)
  const isValidAmount = fromAmount && parseFloat(fromAmount) > 0

  if (currentStep === 'convert') {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />

          <div className="space-y-6 mt-6">
            {/* From Currency Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm text-gray-500 font-medium">De</Label>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Saldo Disponível {userBalances[fromCurrency].toLocaleString(undefined, {
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
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-right text-2xl md:text-2xl font-semibold bg-transparent outline-none flex-1 min-w-0 text-gray-900 placeholder-gray-400 overflow-hidden"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapCurrencies}
                className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
              >
                <ArrowUpDown className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* To Currency Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm text-gray-500 font-medium">Para</Label>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Saldo Disponível {userBalances[toCurrency].toLocaleString(undefined, {
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
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-right text-2xl md:text-2xl font-semibold bg-transparent outline-none flex-1 min-w-0 text-gray-900 placeholder-gray-400 overflow-hidden"
                />
              </div>
            </div>



            {/* Exchange Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Tipo de câmbio</Label>
              
              <div className="space-y-2">
                {/* Auto Option */}
                <div
                  onClick={() => handleExchangeTypeChange('auto')}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                    exchangeType === 'auto' 
                      ? 'border-black shadow-sm' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Automático</div>
                        <div className="text-sm text-gray-500">
                          {isValidAmount && exchangeType === 'auto' 
                            ? `Você recebe ${toAmount} ${toCurrency} agora`
                            : 'Conversão imediata com taxa atual'
                          }
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
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
                  onClick={() => handleExchangeTypeChange('manual')}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                    exchangeType === 'manual' 
                      ? 'border-black shadow-sm' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Manual</div>
                        <div className="text-sm text-gray-500">
                          {exchangeType === 'manual' && toAmount && parseFloat(toAmount) > 0
                            ? `Você recebe ${toAmount} ${toCurrency} quando encontrarmos o câmbio que você quer`
                            : 'Escolha quanto você quer receber'
                          }
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
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
          </div>

          {/* Desktop Continue Button */}
          <div className="hidden md:block mt-8">
            <Button
              onClick={handleConvert}
              disabled={!isValidAmount}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 rounded-2xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Visualizar
            </Button>
          </div>
        </main>

        {/* Mobile Fixed Bottom Button */}
        <div className="md:hidden">
          <FixedBottomAction
            primaryAction={{
              label: "Visualizar",
              onClick: handleConvert,
              disabled: !isValidAmount
            }}
          />
        </div>
      </div>
    )
  }

  return null
}
