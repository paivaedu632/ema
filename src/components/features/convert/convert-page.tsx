'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftRight,
  ArrowLeft,
  ChevronDown,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ConvertPage() {
  const router = useRouter()
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'AOA'>('EUR')
  const [toCurrency, setToCurrency] = useState<'EUR' | 'AOA'>('AOA')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [isLoading, setIsLoading] = useState(false)

  // Mock exchange rate (1 EUR = 1252 AOA)
  const marketRate = fromCurrency === 'EUR' ? 1252 : 0.0007987

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
      const converted = numValue * marketRate
      setToAmount(converted.toFixed(fromCurrency === 'EUR' ? 0 : 6))
    }
  }

  const handleToAmountChange = (value: string) => {
    setToAmount(value)
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

  const handleConvert = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)

    // Show success message or redirect
    alert(`Successfully converted ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}`)
  }

  const availableBalance = userBalances[fromCurrency]
  const fromAmountNum = parseFloat(fromAmount) || 0
  const isInsufficientBalance = fromAmountNum > availableBalance

  // Handle exchange type change
  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)

    if (type === 'auto' && fromAmount) {
      // Recalculate with market rate
      const numValue = parseFloat(fromAmount) || 0
      const converted = numValue * marketRate
      setToAmount(converted.toFixed(fromCurrency === 'EUR' ? 0 : 6))
    } else if (type === 'manual') {
      // Clear to amount for manual entry
      setToAmount('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-4 text-xl font-bold text-gray-900">Converter</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* From Currency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Você converte</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0,00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="pr-20 text-lg h-12"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <span className="font-medium text-gray-900">{fromCurrency}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
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
                className="rounded-full p-3 bg-gray-50 hover:bg-gray-100"
              >
                🔄
              </Button>
            </div>

            {/* To Currency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Você recebe
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={exchangeType === 'auto' ?
                    (fromAmount ? (parseFloat(fromAmount) * marketRate).toFixed(fromCurrency === 'EUR' ? 0 : 6) : '0') :
                    '0,00'
                  }
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                  disabled={exchangeType === 'auto'}
                  className={`pr-20 text-lg h-12 ${exchangeType === 'auto' ? 'bg-gray-50' : ''}`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <span className="font-medium text-gray-900">{toCurrency}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Exchange Type Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Tipo de câmbio?</Label>

              {/* Auto Option */}
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  exchangeType === 'auto' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleExchangeTypeChange('auto')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    exchangeType === 'auto' ? 'border-yellow-400 bg-yellow-400' : 'border-gray-300'
                  }`}>
                    {exchangeType === 'auto' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Automático</div>
                    <div className="text-sm text-gray-600">
                      Você recebe {fromAmount ? (parseFloat(fromAmount) * marketRate).toFixed(fromCurrency === 'EUR' ? 0 : 6) : '0'} {toCurrency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Option */}
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  exchangeType === 'manual' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleExchangeTypeChange('manual')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    exchangeType === 'manual' ? 'border-yellow-400 bg-yellow-400' : 'border-gray-300'
                  }`}>
                    {exchangeType === 'manual' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Manual</div>
                    <div className="text-sm text-gray-600">
                      Escolha quanto você quer receber.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Câmbio:</strong> 1 {fromCurrency} = {marketRate.toLocaleString()} {toCurrency}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Tempo:</strong> {exchangeType === 'auto' ? 'Segundos' : 'Até encontrarmos um comprador'}
              </div>
            </div>

            {/* Convert Button */}
            <Button
              onClick={handleConvert}
              disabled={!fromAmount || (exchangeType === 'manual' && !toAmount) || isInsufficientBalance || isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                'CONFIRMAR'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


