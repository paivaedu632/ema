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
  TrendingUp,
  TrendingDown,
  Clock,
  Info,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ConversionRate {
  from: 'EUR' | 'AOA'
  to: 'EUR' | 'AOA'
  rate: number
  change24h: number
  changePercent: number
  lastUpdated: string
}

export default function ConvertPage() {
  const router = useRouter()
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'AOA'>('EUR')
  const [toCurrency, setToCurrency] = useState<'EUR' | 'AOA'>('AOA')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Mock exchange rates
  const exchangeRates: ConversionRate[] = [
    {
      from: 'EUR',
      to: 'AOA',
      rate: 650.25,
      change24h: -5.75,
      changePercent: -0.88,
      lastUpdated: new Date().toISOString()
    },
    {
      from: 'AOA',
      to: 'EUR',
      rate: 0.001538,
      change24h: 0.000014,
      changePercent: 0.91,
      lastUpdated: new Date().toISOString()
    }
  ]

  // Mock user balances
  const userBalances = {
    EUR: 2847.50,
    AOA: 1250000
  }

  const getCurrentRate = () => {
    return exchangeRates.find(rate => rate.from === fromCurrency && rate.to === toCurrency)
  }

  const handleAmountChange = (value: string, isFromAmount: boolean) => {
    const rate = getCurrentRate()
    if (!rate) return

    if (isFromAmount) {
      setFromAmount(value)
      const numValue = parseFloat(value) || 0
      const converted = numValue * rate.rate
      setToAmount(converted.toFixed(fromCurrency === 'EUR' ? 2 : 6))
    } else {
      setToAmount(value)
      const numValue = parseFloat(value) || 0
      const converted = numValue / rate.rate
      setFromAmount(converted.toFixed(fromCurrency === 'EUR' ? 2 : 6))
    }
  }

  const handleSwapCurrencies = () => {
    const newFromCurrency = toCurrency
    const newToCurrency = fromCurrency
    setFromCurrency(newFromCurrency)
    setToCurrency(newToCurrency)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleConvert = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    
    // Show success message or redirect
    alert(`Successfully converted ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}`)
  }

  const currentRate = getCurrentRate()
  const availableBalance = userBalances[fromCurrency]
  const fromAmountNum = parseFloat(fromAmount) || 0
  const isInsufficientBalance = fromAmountNum > availableBalance

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-yellow-400 rounded flex items-center justify-center">
                  <ArrowLeftRight className="h-5 w-5 text-black" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Convert</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conversion Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>Convert {fromCurrency} to {toCurrency}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* From Currency */}
                <div className="space-y-2">
                  <Label htmlFor="from-amount">From</Label>
                  <div className="relative">
                    <Input
                      id="from-amount"
                      type="number"
                      placeholder="0.00"
                      value={fromAmount}
                      onChange={(e) => handleAmountChange(e.target.value, true)}
                      className="pr-16 text-lg"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Badge variant="secondary" className="font-medium">
                        {fromCurrency}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Available: {formatCurrency(availableBalance, fromCurrency)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-blue-600"
                      onClick={() => handleAmountChange(availableBalance.toString(), true)}
                    >
                      Max
                    </Button>
                  </div>
                  {isInsufficientBalance && (
                    <p className="text-sm text-red-600">Insufficient balance</p>
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
                <div className="space-y-2">
                  <Label htmlFor="to-amount">To</Label>
                  <div className="relative">
                    <Input
                      id="to-amount"
                      type="number"
                      placeholder="0.00"
                      value={toAmount}
                      onChange={(e) => handleAmountChange(e.target.value, false)}
                      className="pr-16 text-lg"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Badge variant="secondary" className="font-medium">
                        {toCurrency}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Exchange Rate Info */}
                {currentRate && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <div className="flex items-center space-x-2">
                        {currentRate.changePercent > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${
                          currentRate.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {currentRate.changePercent > 0 ? '+' : ''}{currentRate.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      1 {fromCurrency} = {currentRate.rate.toLocaleString()} {toCurrency}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>Last updated: {new Date(currentRate.lastUpdated).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                {/* Convert Button */}
                <Button
                  onClick={handleConvert}
                  disabled={!fromAmount || !toAmount || isInsufficientBalance || isLoading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    `Convert ${fromCurrency} to ${toCurrency}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Market Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {exchangeRates.map((rate) => (
                  <div key={`${rate.from}-${rate.to}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{rate.from}/{rate.to}</span>
                      <div className="flex items-center space-x-1">
                        {rate.changePercent > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${
                          rate.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      {rate.rate.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      24h Change: {rate.change24h > 0 ? '+' : ''}{rate.change24h.toFixed(rate.from === 'EUR' ? 2 : 6)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>Important Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>• Exchange rates are updated in real-time</p>
                <p>• No conversion fees for amounts over €100</p>
                <p>• Conversions are processed instantly</p>
                <p>• Rate locks for 30 seconds during conversion</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
