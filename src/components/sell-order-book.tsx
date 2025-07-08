'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, TrendingDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TRANSACTION_LIMITS, validateTransactionAmount } from '@/utils/transaction-validation'

// Order Book Sell Component - Professional Trading Interface
// Replaces legacy marketplace-based sell component

interface WalletBalance {
  currency: string
  available_balance: number
}

interface OrderBookData {
  best_bid: number | null
  best_ask: number | null
  spread: number | null
  mid_price: number | null
}

const sellOrderSchema = z.object({
  orderType: z.enum(['market', 'limit']),
  baseCurrency: z.enum(['EUR', 'AOA']),
  quoteCurrency: z.enum(['AOA', 'EUR']),
  quantity: z.string().min(1, 'Quantidade é obrigatória'),
  price: z.string().optional()
})

type SellOrderForm = z.infer<typeof sellOrderSchema>

export function SellOrderBook() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [orderResult, setOrderResult] = useState<any>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<SellOrderForm>({
    resolver: zodResolver(sellOrderSchema),
    defaultValues: {
      orderType: 'market',
      baseCurrency: 'EUR',
      quoteCurrency: 'AOA'
    }
  })

  const watchedOrderType = watch('orderType')
  const watchedBaseCurrency = watch('baseCurrency')
  const watchedQuoteCurrency = watch('quoteCurrency')
  const watchedQuantity = watch('quantity')
  const watchedPrice = watch('price')

  // Fetch wallet balances
  useEffect(() => {
    const fetchWalletBalances = async () => {
      try {
        const response = await fetch('/api/wallet/balances')
        const result = await response.json()
        
        if (result.success) {
          setWalletBalances(result.data)
        }
      } catch (error) {
        console.error('Error fetching wallet balances:', error)
      }
    }

    fetchWalletBalances()
  }, [])

  // Fetch order book data
  useEffect(() => {
    const fetchOrderBookData = async () => {
      if (!watchedBaseCurrency || !watchedQuoteCurrency) return

      try {
        const response = await fetch(`/api/orderbook/${watchedBaseCurrency}/${watchedQuoteCurrency}`)
        const result = await response.json()
        
        if (result.success) {
          setOrderBookData(result.data)
        }
      } catch (error) {
        console.error('Error fetching order book data:', error)
      }
    }

    fetchOrderBookData()
  }, [watchedBaseCurrency, watchedQuoteCurrency])

  // Get available balance for the base currency (what user is selling)
  const getAvailableBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // Validate transaction amount
  const validateAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return null
    
    return validateTransactionAmount(numAmount, currency as 'EUR' | 'AOA')
  }

  // Calculate estimated proceeds for market orders
  const getEstimatedProceeds = (): number => {
    if (!watchedQuantity || !orderBookData) return 0
    
    const quantity = parseFloat(watchedQuantity)
    if (isNaN(quantity)) return 0

    if (watchedOrderType === 'market') {
      // For market orders, use best bid price
      return orderBookData.best_bid ? quantity * orderBookData.best_bid : 0
    } else {
      // For limit orders, use specified price
      const price = parseFloat(watchedPrice || '0')
      return quantity * price
    }
  }

  // Handle currency pair swap
  const handleCurrencySwap = () => {
    setValue('baseCurrency', watchedQuoteCurrency)
    setValue('quoteCurrency', watchedBaseCurrency)
  }

  // Submit order
  const onSubmit = async (data: SellOrderForm) => {
    setIsLoading(true)
    
    try {
      const orderData = {
        orderType: data.orderType,
        side: 'sell',
        baseCurrency: data.baseCurrency,
        quoteCurrency: data.quoteCurrency,
        quantity: parseFloat(data.quantity),
        ...(data.orderType === 'limit' && { price: parseFloat(data.price || '0') })
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
        setOrderResult(result.data)
        setCurrentStep('success')
      } else {
        alert(`Erro ao criar ordem: ${result.error}`)
      }
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Erro ao processar ordem. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Render form step
  const renderForm = () => {
    const availableBalance = getAvailableBalance(watchedBaseCurrency)
    const estimatedProceeds = getEstimatedProceeds()
    const amountValidation = watchedQuantity ? validateAmount(watchedQuantity, watchedBaseCurrency) : null
    const hasInsufficientBalance = parseFloat(watchedQuantity || '0') > availableBalance

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Vender Moeda</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Nova Ordem de Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Order Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Ordem</label>
                <Select value={watchedOrderType} onValueChange={(value) => setValue('orderType', value as 'market' | 'limit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Ordem de Mercado (Execução Imediata)</SelectItem>
                    <SelectItem value="limit">Ordem Limitada (Preço Específico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currency Pair */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Moeda Base</label>
                  <Select value={watchedBaseCurrency} onValueChange={(value) => setValue('baseCurrency', value as 'EUR' | 'AOA')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="AOA">AOA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Moeda Cotação</label>
                  <Select value={watchedQuoteCurrency} onValueChange={(value) => setValue('quoteCurrency', value as 'EUR' | 'AOA')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AOA">AOA</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={handleCurrencySwap} className="w-full">
                Trocar Par de Moedas
              </Button>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantidade ({watchedBaseCurrency})
                </label>
                <Input
                  {...register('quantity')}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12"
                />
                {errors.quantity && (
                  <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
                )}
                {amountValidation && !amountValidation.isValid && (
                  <p className="text-red-500 text-sm mt-1">{amountValidation.error}</p>
                )}
              </div>

              {/* Price (for limit orders) */}
              {watchedOrderType === 'limit' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preço ({watchedQuoteCurrency} por {watchedBaseCurrency})
                  </label>
                  <Input
                    {...register('price')}
                    type="number"
                    step="0.000001"
                    placeholder="0.000000"
                    className="h-12"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                  )}
                </div>
              )}

              {/* Market Data */}
              {orderBookData && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Dados do Mercado</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Melhor Oferta:</span>
                        <p className="font-medium">
                          {orderBookData.best_bid ? orderBookData.best_bid.toFixed(6) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Melhor Pedido:</span>
                        <p className="font-medium">
                          {orderBookData.best_ask ? orderBookData.best_ask.toFixed(6) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Summary */}
              {watchedQuantity && parseFloat(watchedQuantity) > 0 && (
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Resumo da Ordem</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quantidade:</span>
                        <span>{parseFloat(watchedQuantity).toFixed(2)} {watchedBaseCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Receberá Aprox.:</span>
                        <span>{estimatedProceeds.toFixed(2)} {watchedQuoteCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saldo Disponível:</span>
                        <span>{availableBalance.toFixed(2)} {watchedBaseCurrency}</span>
                      </div>
                      {hasInsufficientBalance && (
                        <p className="text-red-500 text-sm">Saldo insuficiente</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                type="submit"
                disabled={!isValid || hasInsufficientBalance || isLoading}
                className="w-full h-12"
              >
                {isLoading ? 'Processando...' : 'Criar Ordem de Venda'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render success step
  const renderSuccess = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Ordem Criada com Sucesso!</h1>
        <p className="text-gray-600">Sua ordem de venda foi criada e está sendo processada.</p>
      </div>

      {orderResult && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ID da Ordem:</span>
                <span className="font-mono">{orderResult.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">{orderResult.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor Reservado:</span>
                <span>{orderResult.reserved_amount} {orderResult.reserved_currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={() => router.push('/orders')} className="flex-1">
          Ver Minhas Ordens
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1">
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {currentStep === 'form' && renderForm()}
      {currentStep === 'success' && renderSuccess()}
    </div>
  )
}
