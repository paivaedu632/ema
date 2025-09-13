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
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
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

    // Auto-calculate convert amount for auto mode (bidirectional)
    if (exchangeType === 'auto') {
      const numValue = parseFloat(value) || 0
      const converted = numValue / marketRate
      setFromAmount(converted.toFixed(fromCurrency === 'AOA' ? 0 : 6))
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
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 space-y-6">
            {/* You send exactly - Wise style */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Você converte exatamente
              </Label>
              <div className="relative border border-gray-300 rounded-lg p-4 bg-white">
                <Input
                  type="number"
                  placeholder="0"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="border-0 p-0 text-2xl font-medium h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {fromCurrency === 'EUR' ? '€' : 'R$'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{fromCurrency}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Disponível: {formatCurrency(availableBalance, fromCurrency)}
              </div>
              {isInsufficientBalance && (
                <p className="text-sm text-red-600">Saldo insuficiente</p>
              )}
            </div>

            {/* Recipient gets - Wise style */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Destinatário recebe
              </Label>
              <div className="relative border border-gray-300 rounded-lg p-4 bg-white">
                <Input
                  type="number"
                  placeholder="0"
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                  className="border-0 p-0 text-2xl font-medium h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {toCurrency === 'EUR' ? '€' : 'Kz'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{toCurrency}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Paying with - Wise style */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Convertendo com</Label>
              <div className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                      <span className="text-black text-sm font-bold">E</span>
                    </div>
                    <span className="font-medium text-gray-900">{exchangeType === 'auto' ? 'Automático' : 'Manual'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-600 cursor-pointer">
                    <span className="text-sm font-medium">Alterar</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fee breakdown - Wise style */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa EmaPay</span>
                  <span className="font-medium">0 {fromCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nossa taxa</span>
                  <span className="font-medium">
                    {fromAmount ? (parseFloat(fromAmount) * 0.01).toFixed(2) : '0.00'} {fromCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa de câmbio</span>
                  <span className="font-medium">1 {fromCurrency} = {marketRate.toLocaleString()} {toCurrency}</span>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900">Total incluindo taxas (1.0%)</span>
                <span className="text-gray-900">
                  {fromAmount ? (parseFloat(fromAmount) * 1.01).toFixed(2) : '0.00'} {fromCurrency}
                </span>
              </div>
            </div>

            {/* Convert Button - Wise style */}
            <Button
              onClick={handleConvert}
              disabled={!fromAmount || (exchangeType === 'manual' && !toAmount) || isInsufficientBalance || isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg h-12 text-base"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                'Converter agora'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


