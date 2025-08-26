'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react'
import { toast } from 'sonner'
import { formatAmountWithCurrency, formatPercentage, type Currency } from '@/lib/format'

interface DynamicPricingToggleProps {
  orderId: string
  currentPrice: number
  originalPrice?: number
  dynamicPricingEnabled: boolean
  currency: string
  onToggle?: (enabled: boolean) => void
}

export function DynamicPricingToggle({
  orderId,
  currentPrice,
  originalPrice,
  dynamicPricingEnabled,
  currency,
  onToggle
}: DynamicPricingToggleProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [enabled, setEnabled] = useState(dynamicPricingEnabled)

  const handleToggle = async (newEnabled: boolean) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/orders/${orderId}/dynamic-pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newEnabled
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle dynamic pricing')
      }

      const result = await response.json()
      
      if (result.success) {
        setEnabled(newEnabled)
        onToggle?.(newEnabled)
        
        toast.success(
          newEnabled 
            ? 'Preços dinâmicos ativados com sucesso' 
            : 'Preços dinâmicos desativados com sucesso'
        )
      } else {
        throw new Error(result.error || 'Failed to toggle dynamic pricing')
      }
    } catch (error) {
      console.error('Error toggling dynamic pricing:', error)
      toast.error('Erro ao alterar configuração de preços dinâmicos')
    } finally {
      setIsLoading(false)
    }
  }

  const priceChange = originalPrice && currentPrice !== originalPrice
    ? ((currentPrice - originalPrice) / originalPrice) * 100
    : 0

  const getPriceChangeIcon = () => {
    if (priceChange > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (priceChange < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Activity className="h-4 w-4 text-gray-400" />
  }

  const getPriceChangeColor = () => {
    if (priceChange > 0) return 'text-green-600'
    if (priceChange < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Preços Dinâmicos
            </CardTitle>
            <CardDescription>
              Ajuste automático de preços baseado em condições de mercado
            </CardDescription>
          </div>
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Price Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Preço Atual</p>
            <p className="text-lg font-semibold">
              {formatAmountWithCurrency(currentPrice, currency as Currency)}
            </p>
          </div>
          
          {originalPrice && originalPrice !== currentPrice && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Mudança</p>
              <div className={`flex items-center gap-1 ${getPriceChangeColor()}`}>
                {getPriceChangeIcon()}
                <span className="font-medium">
                  {priceChange > 0 ? '+' : ''}{formatPercentage(priceChange / 100)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Original Price (if different) */}
        {originalPrice && originalPrice !== currentPrice && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Preço Original:</span>
            <span>{formatAmountWithCurrency(originalPrice, currency as Currency)}</span>
          </div>
        )}

        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <p className="font-medium">Ativar Preços Dinâmicos</p>
            <p className="text-sm text-gray-600">
              Permite ajustes automáticos baseados no VWAP do mercado
            </p>
          </div>
          
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            className="ml-4"
          />
        </div>

        {/* Information Box */}
        {enabled && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="space-y-1 text-xs">
                <li>• Preços são atualizados a cada 5 minutos</li>
                <li>• Baseado no VWAP das últimas 12 horas</li>
                <li>• Margem competitiva de 3% abaixo do VWAP</li>
                <li>• Limitado a ±20% do preço original</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/orders/${orderId}/price-history`, '_blank')}
            className="flex-1"
          >
            Ver Histórico
          </Button>
          
          {enabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/market/vwap/EUR-AOA`, '_blank')}
              className="flex-1"
            >
              Ver VWAP
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Atualizando configuração...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
