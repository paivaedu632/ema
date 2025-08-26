'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Eye,
  EyeOff
} from 'lucide-react'
import { formatAmountWithCurrency, formatAmountForInput, type Currency } from '@/lib/format'

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  order_count: number
}

interface OrderBookData {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
  lastUpdate: string
}

interface OrderBookDisplayProps {
  orderBook: OrderBookData | null
  isLoading: boolean
  onPriceClick: (price: number, side: 'ask' | 'bid') => void
  currentPair: string
  maxLevels?: number
  showDepth?: boolean
}

export function OrderBookDisplay({
  orderBook,
  isLoading,
  onPriceClick,
  currentPair,
  maxLevels = 10,
  showDepth = true
}: OrderBookDisplayProps) {
  const [showFullDepth, setShowFullDepth] = useState(false)
  
  const [baseCurrency, quoteCurrency] = currentPair.split('-') as ['EUR' | 'AOA', 'EUR' | 'AOA']
  
  // Calculate cumulative volumes and depth percentages
  const processedAsks = useMemo(() => {
    if (!orderBook?.asks) return []
    
    const asks = [...orderBook.asks]
      .sort((a, b) => a.price - b.price) // Ascending for asks
      .slice(0, showFullDepth ? undefined : maxLevels)
    
    let cumulativeVolume = 0
    const maxVolume = asks.reduce((sum, level) => sum + level.quantity, 0)
    
    return asks.map(level => {
      cumulativeVolume += level.quantity
      return {
        ...level,
        cumulativeVolume,
        depthPercentage: maxVolume > 0 ? (level.quantity / maxVolume) * 100 : 0
      }
    })
  }, [orderBook?.asks, maxLevels, showFullDepth])

  const processedBids = useMemo(() => {
    if (!orderBook?.bids) return []
    
    const bids = [...orderBook.bids]
      .sort((a, b) => b.price - a.price) // Descending for bids
      .slice(0, showFullDepth ? undefined : maxLevels)
    
    let cumulativeVolume = 0
    const maxVolume = bids.reduce((sum, level) => sum + level.quantity, 0)
    
    return bids.map(level => {
      cumulativeVolume += level.quantity
      return {
        ...level,
        cumulativeVolume,
        depthPercentage: maxVolume > 0 ? (level.quantity / maxVolume) * 100 : 0
      }
    })
  }, [orderBook?.bids, maxLevels, showFullDepth])

  // Calculate spread
  const bestAsk = processedAsks[0]?.price
  const bestBid = processedBids[0]?.price
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0
  const spreadPercentage = bestBid && spread ? (spread / bestBid) * 100 : 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Livro de Ofertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!orderBook || (!orderBook.asks.length && !orderBook.bids.length)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Livro de Ofertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ordem disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Livro de Ofertas
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {spread > 0 && (
              <Badge variant="outline" className="text-xs">
                Spread: {formatCurrency(spread, quoteCurrency)} ({spreadPercentage.toFixed(2)}%)
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDepth(!showFullDepth)}
            >
              {showFullDepth ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 font-medium">
          <div>Preço ({quoteCurrency})</div>
          <div className="text-right">Qtd ({baseCurrency})</div>
          {showDepth && <div className="text-right">Total ({quoteCurrency})</div>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Asks (Sell Orders) */}
        {processedAsks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Vendas</span>
            </div>
            
            <div className="space-y-1">
              {processedAsks.reverse().map((level, index) => (
                <div
                  key={`ask-${level.price}-${index}`}
                  className="relative group cursor-pointer hover:bg-red-50 rounded p-1 transition-colors"
                  onClick={() => onPriceClick(level.price, 'ask')}
                >
                  {/* Depth Bar */}
                  {showDepth && (
                    <div
                      className="absolute inset-y-0 right-0 bg-red-100 opacity-30 rounded"
                      style={{ width: `${level.depthPercentage}%` }}
                    />
                  )}
                  
                  <div className="relative grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium text-red-600">
                      {formatNumber(level.price)}
                    </div>
                    <div className="text-right">
                      {formatNumber(level.quantity)}
                    </div>
                    {showDepth && (
                      <div className="text-right text-gray-600">
                        {formatNumber(level.total)}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover tooltip */}
                  <div className="absolute left-0 top-full mt-1 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    Clique para usar este preço
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spread Indicator */}
        {spread > 0 && (
          <div className="flex items-center justify-center py-2 border-y border-gray-200">
            <div className="text-center">
              <div className="text-xs text-gray-500">Spread</div>
              <div className="text-sm font-medium">
                {formatCurrency(spread, quoteCurrency)}
              </div>
              <div className="text-xs text-gray-500">
                {spreadPercentage.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) */}
        {processedBids.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Compras</span>
            </div>
            
            <div className="space-y-1">
              {processedBids.map((level, index) => (
                <div
                  key={`bid-${level.price}-${index}`}
                  className="relative group cursor-pointer hover:bg-green-50 rounded p-1 transition-colors"
                  onClick={() => onPriceClick(level.price, 'bid')}
                >
                  {/* Depth Bar */}
                  {showDepth && (
                    <div
                      className="absolute inset-y-0 right-0 bg-green-100 opacity-30 rounded"
                      style={{ width: `${level.depthPercentage}%` }}
                    />
                  )}
                  
                  <div className="relative grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium text-green-600">
                      {formatNumber(level.price)}
                    </div>
                    <div className="text-right">
                      {formatNumber(level.quantity)}
                    </div>
                    {showDepth && (
                      <div className="text-right text-gray-600">
                        {formatNumber(level.total)}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover tooltip */}
                  <div className="absolute left-0 top-full mt-1 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    Clique para usar este preço
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Summary */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-500">Melhor Compra</div>
              <div className="font-medium text-green-600">
                {bestBid ? formatCurrency(bestBid, quoteCurrency) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Melhor Venda</div>
              <div className="font-medium text-red-600">
                {bestAsk ? formatCurrency(bestAsk, quoteCurrency) : 'N/A'}
              </div>
            </div>
          </div>
          
          {orderBook.lastUpdate && (
            <div className="mt-2 text-xs text-gray-500">
              Atualizado: {new Date(orderBook.lastUpdate).toLocaleTimeString('pt-PT')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
