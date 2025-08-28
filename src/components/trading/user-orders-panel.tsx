'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime, formatAmountForInput, type Currency } from '@/lib/format'

interface Order {
  id: string
  side: 'buy' | 'sell'
  order_type: 'limit' | 'market'
  base_currency: string
  quote_currency: string
  quantity: number
  remaining_quantity: number
  filled_quantity: number
  price: number | null
  status: 'pending' | 'partially_filled' | 'filled' | 'cancelled'
  dynamic_pricing_enabled: boolean
  original_price: number | null
  last_price_update: string | null
  price_update_count: number
  created_at: string
  updated_at: string
}

interface Trade {
  id: string
  order_id: string
  side: 'buy' | 'sell'
  base_currency: string
  quote_currency: string
  quantity: number
  price: number
  total_amount: number
  executed_at: string
}

interface UserOrdersPanelProps {
  currentPair: string
  className?: string
}

export function UserOrdersPanel({ currentPair, className }: UserOrdersPanelProps) {
  const { user } = useUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set())

  // Fetch user orders and trades
  const fetchUserData = useCallback(async (showRefreshing = false) => {
    if (!user) return

    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      // Fetch orders
      const ordersResponse = await fetch('/api/orders/user')
      const ordersData = await ordersResponse.json()

      if (ordersData.success) {
        setOrders(ordersData.data || [])
      }

      // Fetch recent trades
      const tradesResponse = await fetch('/api/trades/user?limit=10')
      const tradesData = await tradesResponse.json()

      if (tradesData.success) {
        setTrades(tradesData.data || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user])

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrders(prev => new Set(prev).add(orderId))

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Ordem cancelada com sucesso')
        fetchUserData(true)
      } else {
        toast.error('Erro ao cancelar ordem', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Erro ao cancelar ordem')
    } finally {
      setCancellingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  // Toggle dynamic pricing
  const handleToggleDynamicPricing = async (orderId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/dynamic-pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          enabled ? 'Preços dinâmicos ativados' : 'Preços dinâmicos desativados'
        )
        fetchUserData(true)
      } else {
        toast.error('Erro ao alterar preços dinâmicos', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Error toggling dynamic pricing:', error)
      toast.error('Erro ao alterar preços dinâmicos')
    }
  }

  // Filter orders by current pair
  const filteredOrders = orders.filter(order => 
    `${order.base_currency}-${order.quote_currency}` === currentPair
  )

  const activeOrders = filteredOrders.filter(order => 
    order.status === 'pending' || order.status === 'partially_filled'
  )

  const completedOrders = filteredOrders.filter(order => 
    order.status === 'filled' || order.status === 'cancelled'
  )

  // Filter trades by current pair
  const filteredTrades = trades.filter(trade => 
    `${trade.base_currency}-${trade.quote_currency}` === currentPair
  )

  useEffect(() => {
    fetchUserData()
  }, [user, currentPair, fetchUserData])

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
      case 'partially_filled':
        return <Badge variant="outline" className="text-blue-600"><Activity className="h-3 w-3 mr-1" />Parcial</Badge>
      case 'filled':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Executada</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Faça login para ver suas ordens
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Minhas Ordens
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchUserData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Ativas ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídas ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="trades">
              Negociações ({filteredTrades.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders */}
          <TabsContent value="active" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ordem ativa</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">
                        {order.side.toUpperCase()} {formatAmountForInput(order.quantity, order.base_currency as Currency)} {order.base_currency}
                      </span>
                      {order.dynamic_pricing_enabled && (
                        <Badge variant="outline" className="text-xs">
                          Dinâmico
                        </Badge>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Preço</div>
                      <div className="font-medium">
                        {order.price ? formatCurrency(order.price, order.quote_currency as Currency) : 'Mercado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Executado</div>
                      <div className="font-medium">
                        {formatAmountForInput(order.filled_quantity, order.base_currency as Currency)} / {formatAmountForInput(order.quantity, order.base_currency as Currency)}
                      </div>
                    </div>
                  </div>

                  {order.dynamic_pricing_enabled && order.price_update_count > 0 && (
                    <div className="text-xs text-blue-600">
                      Preço atualizado {order.price_update_count} vez(es)
                      {order.last_price_update && (
                        <span className="text-gray-500 ml-2">
                          • Última: {formatDateTime(order.last_price_update)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrders.has(order.id)}
                    >
                      {cancellingOrders.has(order.id) ? 'Cancelando...' : 'Cancelar'}
                    </Button>

                    {order.side === 'sell' && order.order_type === 'limit' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleDynamicPricing(order.id, !order.dynamic_pricing_enabled)}
                      >
                        {order.dynamic_pricing_enabled ? 'Desativar' : 'Ativar'} Dinâmico
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Completed Orders */}
          <TabsContent value="completed" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ordem concluída</p>
              </div>
            ) : (
              completedOrders.slice(0, 10).map(order => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {order.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">
                        {order.side.toUpperCase()} {formatAmountForInput(order.quantity, order.base_currency as Currency)} {order.base_currency}
                      </span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Preço</div>
                      <div className="font-medium">
                        {order.price ? formatCurrency(order.price, order.quote_currency as Currency) : 'Mercado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Executado</div>
                      <div className="font-medium">
                        {formatAmountForInput(order.filled_quantity, order.base_currency as Currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Data</div>
                      <div className="font-medium">
                        {formatDateTime(order.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Recent Trades */}
          <TabsContent value="trades" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma negociação recente</p>
              </div>
            ) : (
              filteredTrades.map(trade => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trade.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">
                        {trade.side.toUpperCase()} {formatAmountForInput(trade.quantity, trade.base_currency as Currency)} {trade.base_currency}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Executada
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Preço</div>
                      <div className="font-medium">
                        {formatCurrency(trade.price, trade.quote_currency as Currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total</div>
                      <div className="font-medium">
                        {formatCurrency(trade.total_amount, trade.quote_currency as Currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Data</div>
                      <div className="font-medium">
                        {formatDateTime(trade.executed_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
