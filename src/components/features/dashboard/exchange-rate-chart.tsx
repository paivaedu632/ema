'use client'

import React from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useCurrentMarketRate, useMarketSummary } from '@/hooks/use-api'
import { Skeleton } from '@/components/ui/skeleton'

// Mock exchange rate data for EUR/AOA with more realistic fluctuations
const exchangeRateData = [
  { time: '00:00', rate: 650.25 },
  { time: '01:00', rate: 651.10 },
  { time: '02:00', rate: 649.80 },
  { time: '03:00', rate: 651.75 },
  { time: '04:00', rate: 652.45 },
  { time: '05:00', rate: 651.90 },
  { time: '06:00', rate: 653.20 },
  { time: '07:00', rate: 654.10 },
  { time: '08:00', rate: 653.85 },
  { time: '09:00', rate: 654.75 },
  { time: '10:00', rate: 655.30 },
  { time: '11:00', rate: 655.15 },
  { time: '12:00', rate: 654.90 },
  { time: '13:00', rate: 656.20 },
  { time: '14:00', rate: 655.85 },
  { time: '15:00', rate: 657.10 },
  { time: '16:00', rate: 656.75 },
  { time: '17:00', rate: 658.30 },
  { time: '18:00', rate: 657.95 },
  { time: '19:00', rate: 659.15 },
  { time: '20:00', rate: 658.80 },
  { time: '21:00', rate: 660.25 },
  { time: '22:00', rate: 659.90 },
  { time: '23:00', rate: 661.45 },
]

const chartConfig = {
  rate: {
    label: 'Taxa de Câmbio',
    color: '#000000',
  },
}

interface ExchangeRateChartProps {
  className?: string
}

export function ExchangeRateChart({ className }: ExchangeRateChartProps) {
  // Fetch real-time market data
  const { data: currentRate, isLoading: rateLoading, error: rateError } = useCurrentMarketRate('EUR', 'AOA')
  const { data: marketSummary, isLoading: summaryLoading, error: summaryError } = useMarketSummary()

  // Use API data or fallback to mock data
  const isLoading = rateLoading || summaryLoading
  const hasError = rateError || summaryError

  // Generate chart data from current rate (for now, we'll use the static data as fallback)
  // TODO: In a real implementation, this would come from historical data API
  const chartData = currentRate ?
    // Generate some sample historical data around the current rate
    Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}:00`,
      rate: (currentRate as any).rate + (Math.random() - 0.5) * 10 // Add some variation
    })) :
    exchangeRateData

  // Calculate rate change
  const firstRate = chartData[0]?.rate || 0
  const lastRate = chartData[chartData.length - 1]?.rate || 0
  const rateChange = lastRate - firstRate
  const rateChangePercent = firstRate > 0 ? ((rateChange / firstRate) * 100).toFixed(2) : '0.00'
  const isPositive = rateChange >= 0
  const maxRate = Math.max(...exchangeRateData.map(d => d.rate))
  const minRate = Math.min(...exchangeRateData.map(d => d.rate))

  // Get current date in Portuguese format
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Show loading state
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm ${className}`}>
        <div className="mb-6">
          <div className="flex items-baseline space-x-2 sm:space-x-3 mb-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[200px] sm:h-[250px] lg:h-[300px] w-full mb-4" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    )
  }

  // Show error state with fallback to mock data
  if (hasError) {
    console.warn('Market data API error, using fallback data:', rateError || summaryError)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-baseline space-x-2 sm:space-x-3 mb-2">
          <h3 className="text-xl sm:text-2xl font-bold text-black">
            1 EUR = {lastRate.toFixed(0)} AOA
          </h3>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? '▲' : '▼'}
            </span>
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{rateChange.toFixed(2)} • {rateChangePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
          <AreaChart data={exchangeRateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={false}
              height={0}
            />
            <YAxis
              domain={['dataMin - 1', 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={false}
              width={0}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-black text-white px-3 py-2 rounded-md shadow-lg text-sm">
                      <div className="font-mono font-medium text-white">
                        {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value} AOA
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        {label}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#000000"
              strokeWidth={1.5}
              fill="url(#rateGradient)"
              dot={false}
              activeDot={{ r: 3, fill: '#000000', strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>

        {/* Y-axis labels with AOA currency */}
        <div className="absolute right-0 top-4 text-xs text-gray-400 font-mono">
          {maxRate.toFixed(0)} AOA
        </div>
        <div className="absolute right-0 bottom-16 text-xs text-gray-400 font-mono">
          {minRate.toFixed(0)} AOA
        </div>

        {/* Current rate indicator */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="bg-black text-white px-2 py-1 rounded text-xs font-mono">
            {lastRate.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Time Range Buttons */}
      <div className="mt-4 sm:mt-6 mb-4">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
            48H
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
            1W
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded-full">
            1M
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
            6M
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
            12M
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
            5Y
          </button>
        </div>
      </div>

      {/* Enhanced Marketplace Disclaimer */}
      <div className="pt-4 border-t border-gray-200">
        <p className="font-medium text-gray-600 text-base leading-relaxed">
          O EmaPay é um marketplace. Todas as ofertas de câmbio são definidas pelos próprios usuários.
        </p>
      </div>
    </div>
  )
}
