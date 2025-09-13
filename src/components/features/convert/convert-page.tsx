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
  const [fromCurrency, setFromCurrency] = useState<'BRL' | 'EUR'>('BRL')
  const [toCurrency, setToCurrency] = useState<'BRL' | 'EUR'>('EUR')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)

  // Mock exchange rate (1 BRL = 0.1527 EUR, approximately 6.55 BRL = 1 EUR)
  const marketRate = fromCurrency === 'BRL' ? 0.1527 : 6.55

  // Mock user balances
  const userBalances = {
    BRL: 5000.00,
    EUR: 1250.50
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)

    // Auto-calculate receive amount for auto mode
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const converted = numValue * marketRate
      setToAmount(converted.toFixed(2))
    }
  }

  const handleToAmountChange = (value: string) => {
    setToAmount(value)

    // Auto-calculate convert amount for auto mode (bidirectional)
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const converted = numValue / marketRate
      setFromAmount(converted.toFixed(2))
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

  const handleConvert = async () => {
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
      const converted = numValue * marketRate
      setToAmount(converted.toFixed(fromCurrency === 'EUR' ? 0 : 6))
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

  // Main convert page
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
        <div className="space-y-6">
          {/* From Currency */}
          <div className="space-y-3">
            <Label className="text-lg font-medium text-gray-900">
              Você converte
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                className="pr-32 text-3xl font-medium h-20 border-2 rounded-2xl bg-gray-50 border-gray-200"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">🇧🇷</span>
                  </div>
                  <span className="font-semibold text-gray-900 text-lg">BRL</span>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          {/* To Currency */}
          <div className="space-y-3">
            <Label className="text-lg font-medium text-gray-900">
              Você recebe
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                value={toAmount}
                onChange={(e) => handleToAmountChange(e.target.value)}
                className="pr-32 text-3xl font-medium h-20 border-2 rounded-2xl bg-gray-50 border-gray-200"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm">🇪🇺</span>
                  </div>
                  <span className="font-semibold text-gray-900 text-lg">EUR</span>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Exchange Type Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-medium text-gray-900">Tipo de câmbio</Label>
            <div className="p-5 border-2 rounded-2xl bg-gray-50 border-gray-200">
              <div className="text-xl font-medium text-gray-900">Automático</div>
            </div>
          </div>

          {/* Details Breakdown */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-base">Câmbio</span>
              <span className="font-medium text-gray-900">1 BRL = {marketRate.toFixed(4)} EUR</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-base">Taxa</span>
              <span className="font-medium text-gray-900">
                {fromAmount ? (parseFloat(fromAmount) * 0.009).toFixed(2) : '0.00'} EUR
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-base">Entrega</span>
              <span className="font-medium text-gray-900">Imediato</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-semibold text-lg">Você recebe total</span>
                <span className="font-bold text-gray-900 text-xl">
                  {toAmount ? parseFloat(toAmount).toFixed(2) : '0.00'} EUR
                </span>
              </div>
            </div>
          </div>

          {/* Convert Button */}
          <Button
            onClick={handleConvert}
            disabled={!fromAmount || !toAmount || isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold text-lg h-14 rounded-2xl"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Convertendo...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}


