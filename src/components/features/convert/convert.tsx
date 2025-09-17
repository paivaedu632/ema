'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Zap,
  Clock,
  ChevronDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { FlagIcon } from '@/components/ui/flag-icon'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { FixedBottomAction } from '@/components/ui/fixed-bottom-action'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMidpointExchangeRate, usePlaceMarketOrder, usePlaceLimitOrder, useLiquidityCheck } from '@/hooks/use-api'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { getValidationMessageWithRecommendations, PriorityValidationResult } from '@/lib/currency-validation'
import type { MarketOrderRequest, LimitOrderRequest } from '@/types'

// Available currencies - only AOA and EUR
type Currency = 'EUR' | 'AOA'

const currencies: { code: Currency; name: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro', flag: 'eu' },
  { code: 'AOA', name: 'Kwanza', flag: 'ao' },
]

export default function ConvertPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'AOA'>('EUR')
  const [toCurrency, setToCurrency] = useState<'EUR' | 'AOA'>('AOA')

  const [exchangeType, setExchangeType] = useState<'auto' | 'manual'>('auto')
  const [currentStep, setCurrentStep] = useState<'convert' | 'confirm' | 'success'>('convert')
  const [isLoading, setIsLoading] = useState(false)
  const [sourceComponent, setSourceComponent] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Get real-time market rate from midpoint endpoint
  const { data: marketRateData, isLoading: isRateLoading } = useMidpointExchangeRate(
    fromCurrency,
    toCurrency,
    fromCurrency !== toCurrency
  ) as {
    data?: {
      baseCurrency: string
      quoteCurrency: string
      rate: number
      source: string
      lastUpdated: string
    }
    isLoading: boolean
  }

  // Order placement hooks
  const placeMarketOrder = usePlaceMarketOrder()
  const placeLimitOrder = usePlaceLimitOrder()

  // Calculate conversion rate based on currency pair
  const getConversionRate = (from: string, to: string) => {
    if (from === to) return 1

    // Use real market rate if available and matches the requested pair
    if (marketRateData?.rate &&
        marketRateData.baseCurrency === from &&
        marketRateData.quoteCurrency === to) {
      return marketRateData.rate
    }

    // If market rate is for the inverse pair, calculate the inverse
    if (marketRateData?.rate &&
        marketRateData.baseCurrency === to &&
        marketRateData.quoteCurrency === from) {
      return 1 / marketRateData.rate
    }

    // Fallback to hardcoded rates
    if (from === 'EUR' && to === 'AOA') return 1252
    if (from === 'AOA' && to === 'EUR') return 1 / 1252
    return 1
  }

  // Mock user balances
  const userBalances = {
    EUR: 1250.50,
    AOA: 1250000
  }

  // Currency input hooks with priority-based validation
  const fromInput = useCurrencyInput({
    currency: fromCurrency,
    exchangeRate: getConversionRate('EUR', 'AOA'), // Always use EUR->AOA rate for limit calculations
    availableBalance: userBalances[fromCurrency],
    isRequired: true,
    usePriorityValidation: true,
    onValueChange: (numericValue) => {
      if (exchangeType === 'auto') {
        const rate = getConversionRate(fromCurrency, toCurrency)
        const converted = numericValue * rate
        toInput.setValue(converted)
      }
    }
  })

  const toInput = useCurrencyInput({
    currency: toCurrency,
    exchangeRate: getConversionRate('EUR', 'AOA'), // Always use EUR->AOA rate for limit calculations
    availableBalance: userBalances[toCurrency],
    isRequired: false,
    usePriorityValidation: true,
    onValueChange: (numericValue) => {
      if (exchangeType === 'auto') {
        const rate = getConversionRate(toCurrency, fromCurrency)
        const converted = numericValue * rate
        fromInput.setValue(converted)
      }
    }
  })

  // Liquidity check for market orders
  const side: 'buy' | 'sell' = fromCurrency === 'EUR' ? 'sell' : 'buy'
  const liquidityCheck = useLiquidityCheck(
    side,
    fromCurrency,
    toCurrency,
    fromInput.numericValue,
    5.0, // 5% max slippage
    fromInput.numericValue > 0 && fromCurrency !== toCurrency
  )

  // Determine if automatic mode should be available
  const hasLiquidity = liquidityCheck.data?.canExecuteMarketOrder ?? false
  const shouldShowAutomatic = hasLiquidity

  // Auto-select manual mode if automatic is not available
  useEffect(() => {
    if (!shouldShowAutomatic && exchangeType === 'auto') {
      setExchangeType('manual')
    }
  }, [shouldShowAutomatic, exchangeType])

  // Helper function to get priority validation message for "from" input
  const getFromInputMessage = (): PriorityValidationResult => {
    if (fromInput.priorityValidation && !fromInput.priorityValidation.isValid) {
      return fromInput.priorityValidation
    }
    return { isValid: true, priority: 0 }
  }

  // Helper function to get priority validation message for "to" input
  const getToInputMessage = (): PriorityValidationResult => {
    // First check for validation errors
    if (toInput.priorityValidation && !toInput.priorityValidation.isValid) {
      return toInput.priorityValidation
    }

    // If no errors and in manual mode, show recommendation
    if (exchangeType === 'manual' && fromInput.numericValue > 0) {
      const marketRate = getConversionRate(fromCurrency, toCurrency)
      return getValidationMessageWithRecommendations(
        toInput.displayValue,
        toCurrency,
        getConversionRate('EUR', 'AOA'),
        userBalances[toCurrency],
        false,
        true, // show recommendations
        fromInput.numericValue,
        fromCurrency,
        toCurrency
      )
    }

    return { isValid: true, priority: 0 }
  }

  // Component to display priority validation messages
  const ValidationMessage = ({ message }: { message: PriorityValidationResult }) => {
    if (!message.message) return null

    const getMessageStyle = () => {
      switch (message.messageType) {
        case 'error':
          return 'text-red-700' // Standardized dark red for errors
        case 'warning':
          return 'text-red-700' // Standardized dark red for warnings
        case 'info':
          return 'text-red-700' // Standardized dark red for recommendations
        default:
          return 'text-gray-500'
      }
    }

    return (
      <div className={`text-sm mt-1 ${getMessageStyle()}`}>
        {message.message}
      </div>
    )
  }

  // Handle URL parameters from other convert components
  useEffect(() => {
    const step = searchParams.get('step')
    const fromAmountParam = searchParams.get('fromAmount')
    const fromCurrencyParam = searchParams.get('fromCurrency') as Currency
    const toAmountParam = searchParams.get('toAmount')
    const toCurrencyParam = searchParams.get('toCurrency') as Currency
    const exchangeTypeParam = searchParams.get('exchangeType') as 'auto' | 'manual'
    const source = searchParams.get('source')

    if (step === 'confirm' && fromAmountParam && fromCurrencyParam && toCurrencyParam) {
      // Set form data from URL parameters
      fromInput.setValue(parseFloat(fromAmountParam) || 0)
      setFromCurrency(fromCurrencyParam)
      toInput.setValue(parseFloat(toAmountParam || '0') || 0)
      setToCurrency(toCurrencyParam)
      setExchangeType(exchangeTypeParam || 'auto')
      setSourceComponent(source)
      setCurrentStep('confirm')

      // Clean up URL parameters after setting state
      const newUrl = new URL(window.location.href)
      newUrl.search = ''
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  const handleSwapCurrencies = () => {
    const newFromCurrency = toCurrency
    const newToCurrency = fromCurrency
    setFromCurrency(newFromCurrency)
    setToCurrency(newToCurrency)

    // Swap the input values
    const tempFromValue = fromInput.numericValue
    const tempToValue = toInput.numericValue

    fromInput.setValue(tempToValue)
    toInput.setValue(tempFromValue)
  }



  const handleFromCurrencyChange = (currency: 'EUR' | 'AOA') => {
    setFromCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === toCurrency) {
      setToCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromInput.numericValue > 0) {
      const rate = getConversionRate(currency, toCurrency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }

  const handleToCurrencyChange = (currency: 'EUR' | 'AOA') => {
    setToCurrency(currency)
    // Auto-swap to prevent same currency selection
    if (currency === fromCurrency) {
      setFromCurrency(currency === 'EUR' ? 'AOA' : 'EUR')
    }
    // Recalculate if we have an amount and auto mode
    if (exchangeType === 'auto' && fromInput.numericValue > 0) {
      const rate = getConversionRate(fromCurrency, currency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
  }

  const handleBack = () => {
    if (currentStep === 'confirm') {
      // If we came from another convert component, go back to that component
      if (sourceComponent === 'convert-2') {
        router.push('/convert-2')
      } else if (sourceComponent === 'convert-3') {
        router.push('/convert-3')
      } else {
        // Otherwise, go back to the convert step within this component
        setCurrentStep('convert')
      }
    } else {
      router.back()
    }
  }

  const handleConvert = () => {
    setOrderError(null) // Clear any previous errors
    setCurrentStep('confirm')
  }

  const handleConfirmConvert = async () => {
    setIsLoading(true)
    setOrderError(null) // Clear any previous errors

    try {
      // Determine order side based on currency conversion
      // When converting EUR to AOA: sell EUR (buy AOA)
      // When converting AOA to EUR: sell AOA (buy EUR)
      const side: 'buy' | 'sell' = fromCurrency === 'EUR' ? 'sell' : 'buy'

      if (exchangeType === 'auto') {
        // Place market order for automatic exchange
        const marketOrderData: MarketOrderRequest = {
          side,
          amount: fromInput.numericValue,
          baseCurrency: fromCurrency,
          quoteCurrency: toCurrency,
          slippageLimit: 0.05 // 5% slippage limit
        }

        await placeMarketOrder.mutateAsync(marketOrderData)
      } else {
        // Place limit order for manual exchange
        // Calculate the desired exchange rate from user input
        const desiredRate = toInput.numericValue / fromInput.numericValue

        const limitOrderData: LimitOrderRequest = {
          side,
          amount: fromInput.numericValue,
          price: desiredRate,
          baseCurrency: fromCurrency,
          quoteCurrency: toCurrency
        }

        await placeLimitOrder.mutateAsync(limitOrderData)
      }

      setCurrentStep('success')
    } catch (error) {
      console.error('Order placement failed:', error)

      // Check if this is a liquidity-related error for market orders
      if (exchangeType === 'auto' && error instanceof Error) {
        if (error.message.includes('INSUFFICIENT_LIQUIDITY') ||
            error.message.includes('SLIPPAGE_EXCEEDED') ||
            error.message.includes('liquidity') ||
            error.message.includes('slippage') ||
            error.message.includes('insufficient market')) {

          // Redirect to liquidity-changed screen with current market data
          const params = new URLSearchParams({
            fromAmount: fromInput.numericValue.toString(),
            fromCurrency,
            toCurrency,
            originalExpectedAmount: toInput.numericValue.toString(),
            // For now, use a reduced amount as current available
            // In a real implementation, this would come from the error response
            currentAvailableAmount: (toInput.numericValue * 0.7).toString(),
            currentRate: getConversionRate(fromCurrency, toCurrency).toString()
          })

          router.push(`/convert/liquidity-changed?${params}`)
          return
        }
      }

      // Extract error message for user display
      let errorMessage = 'Falha ao processar a conversão. Tente novamente.'

      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          errorMessage = 'Saldo insuficiente para esta conversão.'
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Sessão expirada. Faça login novamente.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.'
        }
      }

      setOrderError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const availableBalance = userBalances[fromCurrency]

  // Handle exchange type change
  const handleExchangeTypeChange = (type: 'auto' | 'manual') => {
    setExchangeType(type)

    if (type === 'auto' && fromInput.numericValue > 0) {
      // Recalculate with market rate when switching to auto
      const rate = getConversionRate(fromCurrency, toCurrency)
      const converted = fromInput.numericValue * rate
      toInput.setValue(converted)
    }
    // In manual mode, preserve existing values - don't clear or change anything
  }



  // Success step - redirect to success page with conversion data
  if (currentStep === 'success') {
    const finalAmount = exchangeType === 'auto'
      ? (fromInput.numericValue * getConversionRate(fromCurrency, toCurrency)).toFixed(toCurrency === 'EUR' ? 6 : 0)
      : toInput.numericValue.toFixed(toCurrency === 'EUR' ? 6 : 0)

    const params = new URLSearchParams({
      type: exchangeType,
      amount: finalAmount,
      currency: toCurrency,
      fromAmount: fromInput.numericValue.toString(),
      fromCurrency: fromCurrency
    })

    router.push(`/convert/success?${params.toString()}`)
    return null
  }

  if (currentStep === 'convert') {
    return (
      <div className="page-container-white">
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Converter"
            onBack={handleBack}
          />
        <div className="space-y-2">
          {/* From Currency */}
          <div className="space-y-1">
            <Label className="text-sm font-bold text-gray-700">
              Você converte
            </Label>
            <div className={`bg-white rounded-lg p-4 focus-within:border-2 ${
              getFromInputMessage().message ? 'border-red-700 border-2' : 'border border-black'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="text"
                    value={fromInput.displayValue}
                    onChange={fromInput.handleInputChange}
                    placeholder="0"
                    className="flex-1 text-left text-2xl font-semibold bg-transparent border-0 outline-none focus:ring-0 text-gray-900 placeholder-gray-400 min-w-0"
                  />

                  <div className="flex items-center gap-2">
                    <FlagIcon
                      countryCode={currencies.find(c => c.code === fromCurrency)?.flag || 'eu'}
                      size="lg"
                    />

                    <Select value={fromCurrency} onValueChange={handleFromCurrencyChange}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{fromCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <FlagIcon countryCode={currency.flag} size="sm" />
                            <span>{currency.code}</span>
                            <span className="text-gray-500 text-sm">- {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm text-black">
              Saldo: {formatCurrency(availableBalance, fromCurrency)}
            </div>

            <ValidationMessage message={getFromInputMessage()} />
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapCurrencies}
              className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <ArrowDown className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* To Currency */}
          <div className="space-y-1">
            <Label className="text-sm font-bold text-gray-700">
              Você recebe
            </Label>
            <div className={`bg-white rounded-lg p-4 focus-within:border-2 ${
              getToInputMessage().message ? 'border-red-700 border-2' : 'border border-black'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="text"
                    value={toInput.displayValue}
                    onChange={toInput.handleInputChange}
                    placeholder="0"
                    className="flex-1 text-left text-2xl font-semibold bg-transparent border-0 outline-none focus:ring-0 text-gray-900 placeholder-gray-400 min-w-0"
                  />

                  <div className="flex items-center gap-2">
                    <FlagIcon
                      countryCode={currencies.find(c => c.code === toCurrency)?.flag || 'ao'}
                      size="lg"
                    />

                    <Select value={toCurrency} onValueChange={handleToCurrencyChange}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{toCurrency}</span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <FlagIcon countryCode={currency.flag} size="sm" />
                            <span>{currency.code}</span>
                            <span className="text-gray-500 text-sm">- {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>
            </div>
            <ValidationMessage message={getToInputMessage()} />
          </div>

          {/* Exchange Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">Tipo de câmbio</Label>

            {/* Auto Option - Only show if liquidity is available */}
            {shouldShowAutomatic && (
              <div
                className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                  exchangeType === 'auto' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleExchangeTypeChange('auto')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                    <Zap className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900 mb-1">Automático</div>
                    <div className="text-sm text-gray-600">
                      Você recebe <span className="font-bold">{fromInput.numericValue > 0 ? formatCurrency(fromInput.numericValue * getConversionRate(fromCurrency, toCurrency), toCurrency) : formatCurrency(0, toCurrency)}</span> agora
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    exchangeType === 'auto' ? 'border-black bg-black' : 'border-gray-300'
                  }`}>
                    {exchangeType === 'auto' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manual Option */}
            <div
              className={`border rounded-lg cursor-pointer transition-colors p-4 ${
                exchangeType === 'manual' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleExchangeTypeChange('manual')}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 mb-1">Manual</div>
                  <div className="text-sm text-gray-600">
                    {exchangeType === 'manual' && toInput.numericValue > 0
                      ? <>Você recebe <span className="font-bold">{formatCurrency(toInput.numericValue, toCurrency)}</span> quando encontrarmos o câmbio que você quer</>
                      : 'Escolha quanto você quer receber'
                    }
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  exchangeType === 'manual' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {exchangeType === 'manual' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div>
          {/* Desktop Button */}
          <div className="hidden md:block mt-6">
            <Button
              onClick={handleConvert}
              disabled={fromInput.numericValue === 0 || (exchangeType === 'manual' && toInput.numericValue === 0) || !fromInput.validation.isValid || !toInput.validation.isValid}
              className="primary-action-button"
            >
              Continuar
            </Button>
          </div>
        </main>

        {/* Mobile Fixed Bottom Button */}
        <div className="md:hidden">
          <FixedBottomAction
            primaryAction={{
              label: "Continuar",
              onClick: handleConvert,
              disabled: fromInput.numericValue === 0 || (exchangeType === 'manual' && toInput.numericValue === 0) || !fromInput.validation.isValid || !toInput.validation.isValid
            }}
          />
        </div>
      </div>
    )
  }

  if (currentStep === 'confirm') {
    return (
      <div className="page-container-white">
        <main className="max-w-md mx-auto px-4 py-6">
          <PageHeader
            title="Tudo certo?"
            onBack={handleBack}
          />



          {/* Currency Exchange Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              {/* From Currency */}
              <div className="flex flex-col items-center text-center">
                <FlagIcon
                  countryCode={fromCurrency === 'EUR' ? 'eu' : 'ao'}
                  size="xl"
                />
                <div className="text-sm text-gray-500 mt-2">Converter</div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(fromInput.numericValue, fromCurrency)}
                </div>
              </div>

              {/* Arrow */}
              <div className="mx-4">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>

              {/* To Currency */}
              <div className="flex flex-col items-center text-center">
                <FlagIcon
                  countryCode={toCurrency === 'EUR' ? 'eu' : 'ao'}
                  size="xl"
                />
                <div className="text-sm text-gray-500 mt-2">Para</div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(
                    exchangeType === 'auto'
                      ? fromInput.numericValue * getConversionRate(fromCurrency, toCurrency)
                      : toInput.numericValue,
                    toCurrency
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details - Wise Style */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Você está convertendo</span>
              <span className="font-medium text-gray-900">{formatCurrency(fromInput.numericValue, fromCurrency)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Câmbio</span>
              <span className="font-medium text-gray-900">
                1 {fromCurrency} = {formatCurrency(getConversionRate(fromCurrency, toCurrency), toCurrency)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Você recebe total</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(
                    exchangeType === 'auto'
                      ? fromInput.numericValue * getConversionRate(fromCurrency, toCurrency)
                      : toInput.numericValue,
                    toCurrency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Processing Info */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              {exchangeType === 'auto'
                ? 'Sua conversão será processada imediatamente com a taxa atual do mercado.'
                : 'Sua conversão será processada quando encontrarmos o câmbio que você quer.'
              }
            </p>
          </div>
          {/* Error Display */}
          {orderError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{orderError}</p>
            </div>
          )}

          {/* Desktop Button */}
          <div className="hidden md:block mt-6">
            <Button
              onClick={handleConfirmConvert}
              className="primary-action-button"
            >
              Confirmar
            </Button>
          </div>
        </main>

        {/* Mobile Fixed Bottom Button */}
        <div className="md:hidden">
          <FixedBottomAction
            primaryAction={{
              label: "Confirmar",
              onClick: handleConfirmConvert
            }}
          />
        </div>

        {/* Loading Overlay */}
        <LoadingOverlay
          isVisible={isLoading || placeMarketOrder.isPending || placeLimitOrder.isPending}
        />
      </div>
    )
  }

  return null
}


