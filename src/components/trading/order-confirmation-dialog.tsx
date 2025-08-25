'use client'

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface OrderData {
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  baseCurrency: string
  quoteCurrency: string
  quantity: number
  price: number
  dynamicPricingEnabled: boolean
  estimatedTotal: number
}

interface OrderConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderData: OrderData
  onConfirm: () => void
  isLoading: boolean
}

export function OrderConfirmationDialog({
  open,
  onOpenChange,
  orderData,
  onConfirm,
  isLoading
}: OrderConfirmationDialogProps) {
  const {
    side,
    type,
    baseCurrency,
    quoteCurrency,
    quantity,
    price,
    dynamicPricingEnabled,
    estimatedTotal
  } = orderData

  // Calculate fees (example: 0.1% trading fee)
  const tradingFee = estimatedTotal * 0.001
  const totalWithFees = estimatedTotal + tradingFee

  // Get order summary text
  const getOrderSummary = () => {
    const action = side === 'buy' ? 'Comprar' : 'Vender'
    const priceText = type === 'market' ? 'ao preço de mercado' : `a ${formatCurrency(price, quoteCurrency)}`
    
    return `${action} ${formatNumber(quantity)} ${baseCurrency} ${priceText}`
  }

  // Get estimated execution info
  const getExecutionInfo = () => {
    if (type === 'market') {
      return {
        title: 'Execução Imediata',
        description: 'Esta ordem será executada imediatamente ao melhor preço disponível no mercado.',
        icon: <Activity className="h-4 w-4 text-blue-600" />,
        color: 'text-blue-600'
      }
    } else {
      return {
        title: 'Ordem Limitada',
        description: `Esta ordem será executada apenas quando o preço ${side === 'buy' ? 'for igual ou menor' : 'for igual ou maior'} que ${formatCurrency(price, quoteCurrency)}.`,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        color: 'text-green-600'
      }
    }
  }

  const executionInfo = getExecutionInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {side === 'buy' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            Confirmar Ordem
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes da sua ordem antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">
                {getOrderSummary()}
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Badge variant={side === 'buy' ? 'default' : 'secondary'}>
                  {side.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {type === 'market' ? 'Mercado' : 'Limitada'}
                </Badge>
                {dynamicPricingEnabled && (
                  <Badge variant="outline" className="text-blue-600">
                    Dinâmico
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Quantidade:</span>
              <span className="font-medium">
                {formatNumber(quantity)} {baseCurrency}
              </span>
            </div>

            {type === 'limit' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Preço:</span>
                <span className="font-medium">
                  {formatCurrency(price, quoteCurrency)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Estimado:</span>
              <span className="font-medium">
                {formatCurrency(estimatedTotal, side === 'buy' ? quoteCurrency : baseCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Taxa de Negociação (0.1%):</span>
              <span className="font-medium">
                {formatCurrency(tradingFee, quoteCurrency)}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center font-semibold">
              <span>Total Final:</span>
              <span>
                {formatCurrency(totalWithFees, side === 'buy' ? quoteCurrency : baseCurrency)}
              </span>
            </div>
          </div>

          {/* Execution Info */}
          <Alert>
            {executionInfo.icon}
            <AlertDescription>
              <div className="font-medium mb-1">{executionInfo.title}</div>
              <div className="text-sm">{executionInfo.description}</div>
            </AlertDescription>
          </Alert>

          {/* Dynamic Pricing Info */}
          {dynamicPricingEnabled && (
            <Alert className="border-blue-200 bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-medium mb-1">Preços Dinâmicos Ativados</div>
                <div className="text-sm">
                  O preço desta ordem será ajustado automaticamente a cada 5 minutos 
                  baseado nas condições do mercado, limitado a ±20% do preço original.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Market Order Warning */}
          {type === 'market' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Atenção - Ordem de Mercado</div>
                <div className="text-sm">
                  Ordens de mercado são executadas imediatamente ao melhor preço disponível. 
                  O preço final pode diferir do estimado devido à volatilidade do mercado.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Risk Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>Aviso de Risco:</strong> A negociação de moedas envolve riscos. 
                Certifique-se de que compreende os riscos antes de prosseguir.
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Ordem'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
