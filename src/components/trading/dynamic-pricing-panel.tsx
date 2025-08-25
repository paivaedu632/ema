'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Activity, 
  TrendingUp, 
  Info, 
  Clock,
  Target,
  BarChart3,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface VWAPData {
  vwap: number | null
  total_volume: number
  trade_count: number
  calculation_period: string
  market_activity: {
    active: boolean
    sufficient_volume: boolean
    data_quality: 'excellent' | 'good' | 'limited' | 'insufficient'
  }
}

interface DynamicPricingPanelProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  vwapData: VWAPData | null
  isLoading: boolean
  currentPrice: number
  currency: string
}

export function DynamicPricingPanel({
  enabled,
  onToggle,
  vwapData,
  isLoading,
  currentPrice,
  currency
}: DynamicPricingPanelProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Calculate suggested price based on VWAP
  const suggestedPrice = vwapData?.vwap ? vwapData.vwap * 0.97 : null // 3% below VWAP
  const priceChange = currentPrice && suggestedPrice 
    ? ((suggestedPrice - currentPrice) / currentPrice) * 100 
    : 0

  // Get data quality info
  const getDataQualityInfo = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return { color: 'text-green-600', label: 'Excelente', description: 'Dados suficientes para cálculo preciso' }
      case 'good':
        return { color: 'text-blue-600', label: 'Boa', description: 'Dados adequados para cálculo confiável' }
      case 'limited':
        return { color: 'text-yellow-600', label: 'Limitada', description: 'Poucos dados disponíveis' }
      case 'insufficient':
        return { color: 'text-red-600', label: 'Insuficiente', description: 'Dados insuficientes para cálculo' }
      default:
        return { color: 'text-gray-600', label: 'Desconhecida', description: 'Qualidade dos dados não determinada' }
    }
  }

  const dataQuality = vwapData?.market_activity.data_quality 
    ? getDataQualityInfo(vwapData.market_activity.data_quality)
    : null

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Preços Dinâmicos</span>
            {enabled && (
              <Badge variant="default" className="text-xs">
                Ativo
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Ajuste automático baseado no VWAP do mercado
          </p>
        </div>
        
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="ml-4"
        />
      </div>

      {/* Dynamic Pricing Details */}
      {enabled && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Informações de Mercado
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Ocultar' : 'Detalhes'}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : vwapData ? (
              <>
                {/* VWAP Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">VWAP (12h)</div>
                    <div className="font-semibold">
                      {vwapData.vwap 
                        ? formatCurrency(vwapData.vwap, currency)
                        : 'N/A'
                      }
                    </div>
                  </div>
                  
                  {suggestedPrice && (
                    <div>
                      <div className="text-sm text-gray-600">Preço Sugerido</div>
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(suggestedPrice, currency)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Change Indicator */}
                {currentPrice > 0 && suggestedPrice && (
                  <div className="flex items-center gap-2 p-3 bg-white rounded border">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm">
                        Ajuste sugerido: 
                        <span className={`ml-1 font-medium ${
                          priceChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        De {formatCurrency(currentPrice, currency)} para {formatCurrency(suggestedPrice, currency)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Market Activity Status */}
                <div className="flex items-center gap-2 p-3 bg-white rounded border">
                  <div className={`h-2 w-2 rounded-full ${
                    vwapData.market_activity.active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      Mercado {vwapData.market_activity.active ? 'Ativo' : 'Inativo'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {vwapData.trade_count} negociações • {formatNumber(vwapData.total_volume)} {currency.split('-')[0]} volume
                    </div>
                  </div>
                  
                  {dataQuality && (
                    <Badge variant="outline" className={`text-xs ${dataQuality.color}`}>
                      {dataQuality.label}
                    </Badge>
                  )}
                </div>

                {/* Detailed Information */}
                {showDetails && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Volume Total</div>
                        <div className="font-medium">{formatNumber(vwapData.total_volume)} EUR</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Negociações</div>
                        <div className="font-medium">{vwapData.trade_count}</div>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="text-gray-600">Período de Cálculo</div>
                      <div className="font-medium">{vwapData.calculation_period}</div>
                    </div>

                    {dataQuality && (
                      <div className="text-sm">
                        <div className="text-gray-600">Qualidade dos Dados</div>
                        <div className={`font-medium ${dataQuality.color}`}>
                          {dataQuality.label} - {dataQuality.description}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Dados de mercado não disponíveis. O sistema usará o melhor preço de venda como referência.
                </AlertDescription>
              </Alert>
            )}

            {/* How It Works */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-medium mb-2">Como funciona:</div>
                <ul className="text-sm space-y-1">
                  <li>• Preços atualizados a cada 5 minutos</li>
                  <li>• Baseado no VWAP das últimas 12 horas</li>
                  <li>• Margem competitiva de 3% abaixo do VWAP</li>
                  <li>• Limitado a ±20% do preço original</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
