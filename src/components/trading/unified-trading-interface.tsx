'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet, 
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { OrderBookDisplay } from './order-book-display'
import { DynamicPricingPanel } from './dynamic-pricing-panel'
import { UserOrdersPanel } from './user-orders-panel'
import { OrderConfirmationDialog } from './order-confirmation-dialog'
import { useOrderBook } from '@/hooks/use-order-book'
import { useUserBalances } from '@/hooks/use-user-balances'
import { useVWAP } from '@/hooks/use-vwap'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface UnifiedTradingInterfaceProps {
  initialPair?: 'EUR-AOA' | 'AOA-EUR'
  initialSide?: 'buy' | 'sell'
  className?: string
}

export function UnifiedTradingInterface({
  initialPair = 'EUR-AOA',
  initialSide = 'buy',
  className
}: UnifiedTradingInterfaceProps) {
  const { user } = useUser()
  
  // State management
  const [currentPair, setCurrentPair] = useState(initialPair)
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>(initialSide)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Hooks for data fetching
  const { orderBook, isLoading: orderBookLoading } = useOrderBook(currentPair)
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserBalances()
  const { vwapData, isLoading: vwapLoading } = useVWAP(currentPair, 12)

  // Derived values
  const [baseCurrency, quoteCurrency] = currentPair.split('-') as ['EUR' | 'AOA', 'EUR' | 'AOA']
  const requiredCurrency = orderSide === 'buy' ? quoteCurrency : baseCurrency
  const availableBalance = balances?.[requiredCurrency]?.available_balance || 0
  const bestAsk = orderBook?.asks?.[0]?.price
  const bestBid = orderBook?.bids?.[0]?.price
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0
  const spreadPercentage = bestBid ? (spread / bestBid) * 100 : 0

  // Calculate estimated total
  const estimatedTotal = () => {
    const qty = parseFloat(quantity) || 0
    const orderPrice = orderType === 'market'
      ? (orderSide === 'buy' ? bestAsk : bestBid) || 0
      : parseFloat(price) || 0

    if (orderSide === 'buy') {
      return qty * orderPrice
    } else {
      return qty * orderPrice
    }
  }

  // Validation
  const validateOrder = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const qty = parseFloat(quantity)
    const orderPrice = parseFloat(price)

    // Quantity validation
    if (!qty || qty <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero'
    }

    // Price validation for limit orders
    if (orderType === 'limit' && (!orderPrice || orderPrice <= 0)) {
      newErrors.price = 'Preço deve ser maior que zero'
    }

    // Balance validation - calculate required amount directly
    const currentOrderPrice = orderType === 'market'
      ? (orderSide === 'buy' ? bestAsk : bestBid) || 0
      : orderPrice || 0

    const requiredAmount = orderSide === 'buy'
      ? qty * currentOrderPrice
      : qty

    if (requiredAmount > availableBalance) {
      newErrors.balance = `Saldo insuficiente. Disponível: ${formatCurrency(availableBalance, requiredCurrency)}`
    }

    // Minimum order size validation
    const minOrderSize = baseCurrency === 'EUR' ? 1 : 1000
    if (qty < minOrderSize) {
      newErrors.quantity = `Mínimo: ${minOrderSize} ${baseCurrency}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [quantity, price, orderType, orderSide, availableBalance, baseCurrency, quoteCurrency, requiredCurrency, bestAsk, bestBid])

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!validateOrder()) return

    setIsPlacingOrder(true)
    
    try {
      const orderData = {
        side: orderSide,
        type: orderType,
        base_currency: baseCurrency,
        quote_currency: quoteCurrency,
        quantity: parseFloat(quantity),
        ...(orderType === 'limit' && { price: parseFloat(price) }),
        ...(orderSide === 'sell' && orderType === 'limit' && { 
          dynamic_pricing_enabled: dynamicPricingEnabled 
        })
      }

      const response = await fetch('/api/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Ordem criada com sucesso', {
          description: `${orderSide.toUpperCase()} ${quantity} ${baseCurrency} ${orderType === 'limit' ? `@ ${price} ${quoteCurrency}` : 'ao mercado'}`
        })

        // Reset form
        setQuantity('')
        setPrice('')
        setDynamicPricingEnabled(false)
        setShowConfirmation(false)
        
        // Refresh balances
        refetchBalances()
      } else {
        toast.error('Erro ao criar ordem', {
          description: result.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      console.error('Order placement error:', error)
      toast.error('Erro ao criar ordem', {
        description: 'Erro de conexão. Tente novamente.'
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Handle order book click-to-fill
  const handleOrderBookClick = (clickedPrice: number, side: 'ask' | 'bid') => {
    setPrice(clickedPrice.toString())
    setOrderSide(side === 'ask' ? 'buy' : 'sell')
    setOrderType('limit')
  }

  // Handle pair switching
  const handlePairSwitch = () => {
    const newPair = currentPair === 'EUR-AOA' ? 'AOA-EUR' : 'EUR-AOA'
    setCurrentPair(newPair)
    setPrice('')
    setQuantity('')
  }

  // Real-time validation
  useEffect(() => {
    if (quantity || price) {
      validateOrder()
    }
  }, [quantity, price, orderSide, orderType, availableBalance])

  return (
    <div className={`w-full ${className}`}>
      {/* Market Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl font-bold">
                {currentPair}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePairSwitch}
              >
                Trocar Par
              </Button>
            </div>
            
            <div className="flex items-center gap-6">
              {bestBid && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Melhor Compra</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(bestBid, quoteCurrency)}
                  </p>
                </div>
              )}
              
              {bestAsk && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Melhor Venda</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(bestAsk, quoteCurrency)}
                  </p>
                </div>
              )}
              
              {spread > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Spread</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(spread, quoteCurrency)} ({spreadPercentage.toFixed(2)}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book - Desktop Left, Mobile Tab */}
        <div className="lg:block hidden">
          <OrderBookDisplay
            orderBook={orderBook}
            isLoading={orderBookLoading}
            onPriceClick={handleOrderBookClick}
            currentPair={currentPair}
          />
        </div>

        {/* Trading Panel - Center */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Negociar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Side Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  className="flex-1 h-12"
                  onClick={() => setOrderSide('buy')}
                >
                  Comprar
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  className="flex-1 h-12"
                  onClick={() => setOrderSide('sell')}
                >
                  Vender
                </Button>
              </div>

              {/* Order Type Selection */}
              <div className="flex gap-2">
                <Button
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOrderType('limit')}
                >
                  Limitada
                </Button>
                <Button
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOrderType('market')}
                >
                  Mercado
                </Button>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantidade ({baseCurrency})
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-12"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600">{errors.quantity}</p>
                )}
              </div>

              {/* Price Input (Limit Orders Only) */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Preço ({quoteCurrency})
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-12"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-600">{errors.price}</p>
                  )}
                </div>
              )}

              {/* Dynamic Pricing (Limit Sell Orders Only) */}
              {orderSide === 'sell' && orderType === 'limit' && (
                <DynamicPricingPanel
                  enabled={dynamicPricingEnabled}
                  onToggle={setDynamicPricingEnabled}
                  vwapData={vwapData}
                  isLoading={vwapLoading}
                  currentPrice={parseFloat(price) || 0}
                  currency={quoteCurrency}
                />
              )}

              {/* Balance and Total */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Saldo Disponível:</span>
                  <span className="font-medium">
                    {formatCurrency(availableBalance, requiredCurrency)}
                  </span>
                </div>
                
                {quantity && (orderType === 'limit' ? price : (bestAsk || bestBid)) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Estimado:</span>
                    <span className="font-medium">
                      {formatCurrency(estimatedTotal(), orderSide === 'buy' ? quoteCurrency : baseCurrency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance Error */}
              {errors.balance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.balance}</AlertDescription>
                </Alert>
              )}

              {/* Place Order Button */}
              <Button
                onClick={() => setShowConfirmation(true)}
                disabled={!validateOrder() || isPlacingOrder || !user}
                className="w-full h-12"
                size="lg"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `${orderSide === 'buy' ? 'Comprar' : 'Vender'} ${baseCurrency}`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* User Orders - Desktop Right, Mobile Tab */}
        <div className="lg:block hidden">
          <UserOrdersPanel currentPair={currentPair} />
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden mt-6">
        <Tabs defaultValue="orderbook" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orderbook">Livro de Ofertas</TabsTrigger>
            <TabsTrigger value="orders">Minhas Ordens</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orderbook" className="mt-4">
            <OrderBookDisplay
              orderBook={orderBook}
              isLoading={orderBookLoading}
              onPriceClick={handleOrderBookClick}
              currentPair={currentPair}
            />
          </TabsContent>
          
          <TabsContent value="orders" className="mt-4">
            <UserOrdersPanel currentPair={currentPair} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Confirmation Dialog */}
      <OrderConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        orderData={{
          side: orderSide,
          type: orderType,
          baseCurrency,
          quoteCurrency,
          quantity: parseFloat(quantity) || 0,
          price: orderType === 'limit' ? parseFloat(price) || 0 : (orderSide === 'buy' ? bestAsk : bestBid) || 0,
          dynamicPricingEnabled: orderSide === 'sell' && orderType === 'limit' ? dynamicPricingEnabled : false,
          estimatedTotal: estimatedTotal()
        }}
        onConfirm={handlePlaceOrder}
        isLoading={isPlacingOrder}
      />
    </div>
  )
}
