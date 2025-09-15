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
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')

  // Mock conversion rate (1 EUR = 1250 AOA)
  const getConversionRate = (from: Currency, to: Currency): number => {
    if (from === to) return 1
    if (from === 'EUR' && to === 'AOA') return 1250
    if (from === 'AOA' && to === 'EUR') return 1 / 1250
    return 1
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)

    // Auto-calculate convert amount for auto mode
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = numValue * rate
      setToAmount(converted.toFixed(toCurrency === 'EUR' ? 6 : 0))
    }
    // In manual mode, don't auto-calculate - preserve user input
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

  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)

    // Recalculate amounts if switching to auto
    if (type === 'auto' && fromAmount) {
      handleFromAmountChange(fromAmount)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleConvert = () => {
    // Handle conversion logic
    console.log('Converting:', fromAmount, fromCurrency, 'to', toAmount, toCurrency)
  }

  const isValidConversion = fromAmount && parseFloat(fromAmount) > 0 && 
                          parseFloat(fromAmount) <= userBalances[fromCurrency]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-4 py-6">
        <PageHeader
          title="Converter"
          onBack={handleBack}
          className="text-foreground"
        />

        <div className="mt-8 space-y-4">
          {/* From Currency Card */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
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
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-right text-2xl font-semibold bg-transparent border-0 outline-none text-card-foreground placeholder-muted-foreground w-32"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Saldo: {formatCurrency(userBalances[fromCurrency], fromCurrency)}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSwapCurrencies}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 border-4 border-background"
            >
              <ArrowDown className="w-5 h-5 text-primary-foreground" />
            </Button>
          </div>

          {/* To Currency Card */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
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
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-right text-2xl font-semibold bg-transparent border-0 outline-none text-card-foreground placeholder-muted-foreground w-32"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Saldo: {formatCurrency(userBalances[toCurrency], toCurrency)}
            </div>

            {/* Market Rate Warning */}
            {exchangeType === 'manual' && fromAmount && toAmount && parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0 && (() => {
              const userRate = parseFloat(toAmount) / parseFloat(fromAmount)
              const marketRate = getConversionRate(fromCurrency, toCurrency)
              const percentageDiff = ((userRate - marketRate) / marketRate) * 100
              const absDiff = Math.abs(percentageDiff)

              // Only show warning if difference is more than 1%
              if (absDiff > 1) {
                return (
                  <div className="mt-2 text-sm">
                    {percentageDiff > 0 ? (
                      <span className="text-orange-600">
                        Valor {absDiff.toFixed(1)}% acima da taxa de mercado
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Valor {absDiff.toFixed(1)}% abaixo da taxa de mercado
                      </span>
                    )}
                  </div>
                )
              }
              return null
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
                    Você recebe {fromAmount ? (parseFloat(fromAmount) * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0) : '0'} {toCurrency} agora
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
                    {exchangeType === 'manual' && toAmount && parseFloat(toAmount) > 0
                      ? `Você recebe ${toAmount} ${toCurrency} quando encontrarmos o câmbio que você quer`
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
          disabled={!isValidConversion}
          className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold"
        >
          Continuar
        </Button>
      </FixedBottomAction>
    </div>
  )
}
