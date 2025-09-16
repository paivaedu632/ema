'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowDown, ChevronDown, Zap, Clock } from 'lucide-react'
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
import { useCurrencyInput } from '@/hooks/use-currency-input'

// Available currencies - EUR and AOA only
type Currency = 'EUR' | 'AOA'

const currencies: { code: Currency; name: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro', flag: 'eu' },
  { code: 'AOA', name: 'Kwanza', flag: 'ao' },
]

// Mock user balances
const userBalances = {
  EUR: 1250.50,
  AOA: 1250000,
}

export default function ConvertDark() {
  const router = useRouter()
  const [fromCurrency, setFromCurrency] = useState<Currency>('EUR')
  const [toCurrency, setToCurrency] = useState<Currency>('AOA')

  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')

  // Mock conversion rate (1 EUR = 1250 AOA)
  const getConversionRate = (from: Currency, to: Currency): number => {
    if (from === to) return 1
    if (from === 'EUR' && to === 'AOA') return 1250
    if (from === 'AOA' && to === 'EUR') return 1 / 1250
    return 1
  }

  // Currency input hooks with validation
  const fromInput = useCurrencyInput({
    currency: fromCurrency,
    exchangeRate: getConversionRate('EUR', 'AOA'),
    availableBalance: userBalances[fromCurrency],
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
    availableBalance: userBalances[toCurrency],
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

  const handleBack = () => {
    router.back()
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
      source: 'convert-2' // Track which component initiated the conversion
    })

    router.push(`/convert?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-md mx-auto px-4 py-6">
        <PageHeader
          title="Converter"
          onBack={handleBack}
          className="text-foreground"
        />

        <div className="mt-8 space-y-4">
          {/* From Currency Card */}
          <div className="bg-card rounded-2xl p-6 border border-black shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FlagIcon
                  countryCode={currencies.find(c => c.code === fromCurrency)?.flag || 'eu'}
                  size="lg"
                />
                <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                  <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-card-foreground">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold text-card-foreground">{fromCurrency}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code} className="text-card-foreground hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <FlagIcon countryCode={currency.flag} size="sm" />
                          <span>{currency.code}</span>
                          <span className="text-muted-foreground text-sm">- {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-right">
                <input
                  type="text"
                  value={fromInput.displayValue}
                  onChange={fromInput.handleInputChange}
                  placeholder="0"
                  className="text-right text-2xl font-semibold bg-transparent border-0 outline-none text-card-foreground placeholder-muted-foreground w-32"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Saldo: {formatCurrency(userBalances[fromCurrency], fromCurrency)}
            </div>
            {!fromInput.validation.isValid && (
              <div className="text-sm text-red-500 mt-1">
                {fromInput.validation.error}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2">
            <button
              onClick={handleSwapCurrencies}
              className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <ArrowDown className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* To Currency Card */}
          <div className="bg-card rounded-2xl p-6 border border-black shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FlagIcon
                  countryCode={currencies.find(c => c.code === toCurrency)?.flag || 'ao'}
                  size="lg"
                />
                <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                  <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-card-foreground">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold text-card-foreground">{toCurrency}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code} className="text-card-foreground hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <FlagIcon countryCode={currency.flag} size="sm" />
                          <span>{currency.code}</span>
                          <span className="text-muted-foreground text-sm">- {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-right">
                <input
                  type="text"
                  value={toInput.displayValue}
                  onChange={toInput.handleInputChange}
                  placeholder="0"
                  className="text-right text-2xl font-semibold bg-transparent border-0 outline-none text-card-foreground placeholder-muted-foreground w-32"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Saldo: {formatCurrency(userBalances[toCurrency], toCurrency)}
            </div>
            {!toInput.validation.isValid && (
              <div className="text-sm text-red-500 mt-1">
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
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-card-foreground">Tipo de câmbio</h3>

            {/* Auto Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                exchangeType === 'auto' ? 'border-primary bg-accent' : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => handleExchangeTypeChange('auto')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-card-foreground mb-1">Automático</div>
                  <div className="text-sm text-muted-foreground">
                    Você recebe <span className="font-bold">{fromInput.numericValue > 0 ? formatCurrency(fromInput.numericValue * getConversionRate(fromCurrency, toCurrency), toCurrency) : formatCurrency(0, toCurrency)}</span> agora
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                exchangeType === 'manual' ? 'border-primary bg-accent' : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => handleExchangeTypeChange('manual')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-card-foreground mb-1">Manual</div>
                  <div className="text-sm text-muted-foreground">
                    {exchangeType === 'manual' && toInput.numericValue > 0
                      ? <>Você recebe <span className="font-bold">{formatCurrency(toInput.numericValue, toCurrency)}</span> quando encontrarmos o câmbio que você quer</>
                      : 'Escolha quanto você quer receber'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action */}
      <FixedBottomAction>
        <Button
          onClick={handleConvert}
          disabled={fromInput.numericValue === 0 || (exchangeType === 'manual' && toInput.numericValue === 0) || !fromInput.validation.isValid || !toInput.validation.isValid}
          className="primary-action-button"
        >
          Continuar
        </Button>
      </FixedBottomAction>
    </div>
  )
}
