"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react"

import { PageHeader } from '@/components/layout/page-header'
import { AmountInput } from '@/components/forms/amount-input'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { formatAmountWithCurrency, formatAmountForInput } from "@/lib/format"

import {
  TRANSACTION_LIMITS,
  VALIDATION_MESSAGES,
  type Currency
} from "@/lib/utils"

type Step = "fromAmount" | "toAmount" | "confirmation" | "success"

interface WalletBalance {
  currency: Currency
  available_balance: number
  reserved_balance: number
  last_updated: string
}

interface ExchangeRate {
  from: Currency
  to: Currency
  rate: number
  change24h: number
  changePercent: number
}

// Zod validation schema
const createConvertAmountSchema = (availableBalance: number, currency: Currency) => {
  const limits = TRANSACTION_LIMITS[currency]

  return z.object({
    amount: z.string()
      .min(1, VALIDATION_MESSAGES.AMOUNT.REQUIRED)
      .refine((val) => {
        const num = Number(val)
        return !isNaN(num) && num > 0
      }, {
        message: VALIDATION_MESSAGES.AMOUNT.INVALID
      })
      .refine((val) => {
        const num = Number(val)
        return num >= limits.min
      }, {
        message: VALIDATION_MESSAGES.AMOUNT.MIN(limits.min, currency)
      })
      .refine((val) => {
        const num = Number(val)
        return num <= limits.max
      }, {
        message: VALIDATION_MESSAGES.AMOUNT.MAX(limits.max, currency)
      })
      .refine((val) => {
        const num = Number(val)
        return num <= availableBalance
      }, {
        message: VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE
      })
  })
}

export default function ConvertSellStyle() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("fromAmount")
  const [fromCurrency, setFromCurrency] = useState<Currency>("EUR")
  const [toCurrency, setToCurrency] = useState<Currency>("AOA")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")

  // Mock wallet balances
  const walletBalances: WalletBalance[] = [
    {
      currency: "EUR",
      available_balance: 2847.50,
      reserved_balance: 152.25,
      last_updated: new Date().toISOString()
    },
    {
      currency: "AOA",
      available_balance: 1250000,
      reserved_balance: 75000,
      last_updated: new Date().toISOString()
    }
  ]

  // Mock exchange rates
  const exchangeRates: ExchangeRate[] = [
    {
      from: "EUR",
      to: "AOA",
      rate: 650.25,
      change24h: -5.75,
      changePercent: -0.88
    },
    {
      from: "AOA",
      to: "EUR",
      rate: 0.001538,
      change24h: 0.000014,
      changePercent: 0.91
    }
  ]

  const currentBalance = walletBalances.find(b => b.currency === fromCurrency)
  const currentRate = exchangeRates.find(r => r.from === fromCurrency && r.to === toCurrency)

  // Form validation
  const amountSchema = useMemo(() => {
    return createConvertAmountSchema(currentBalance?.available_balance || 0, fromCurrency)
  }, [currentBalance?.available_balance, fromCurrency])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(amountSchema),
    mode: "onChange"
  })

  const watchedAmount = watch("amount")

  // Calculate converted amount
  useEffect(() => {
    if (watchedAmount && currentRate) {
      const convertedAmount = Number(watchedAmount) * currentRate.rate
      setToAmount(convertedAmount.toFixed(fromCurrency === "EUR" ? 2 : 6))
    } else {
      setToAmount("")
    }
  }, [watchedAmount, currentRate, fromCurrency])

  const handleSwapCurrencies = () => {
    const newFromCurrency = toCurrency
    const newToCurrency = fromCurrency
    setFromCurrency(newFromCurrency)
    setToCurrency(newToCurrency)
    setFromAmount("")
    setToAmount("")
    setValue("amount", "")
  }

  const handleFromAmountContinue = () => {
    setFromAmount(watchedAmount)
    setCurrentStep("toAmount")
  }

  const handleToAmountContinue = () => {
    setCurrentStep("confirmation")
  }

  const handleConfirmConvert = async () => {
    // Simulate conversion process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setCurrentStep("success")
  }

  const handleBack = () => {
    if (currentStep === "toAmount") {
      setCurrentStep("fromAmount")
    } else if (currentStep === "confirmation") {
      setCurrentStep("toAmount")
    } else {
      router.back()
    }
  }

  const handleSuccess = () => {
    router.push('/binance-dashboard')
  }

  // From Amount Step
  if (currentStep === "fromAmount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Converter Moeda"
            subtitle="Quanto você quer converter?"
            onBack={handleBack}
          />

          <div className="space-y-6">
            {/* Currency Swap */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">De</div>
                <div className="text-lg font-semibold">{fromCurrency}</div>
              </div>
              
              <button
                onClick={handleSwapCurrencies}
                className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftRight className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Para</div>
                <div className="text-lg font-semibold">{toCurrency}</div>
              </div>
            </div>

            {/* Exchange Rate Display */}
            {currentRate && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Taxa de Câmbio</span>
                  <div className="flex items-center space-x-1">
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
              </div>
            )}

            <AmountInput
              {...register("amount")}
              currency={fromCurrency}
              placeholder="0,00"
              error={errors.amount?.message}
            />

            {currentBalance && (
              <AvailableBalance
                balance={currentBalance.available_balance}
                currency={fromCurrency}
                onMaxClick={() => {
                  setValue("amount", currentBalance.available_balance.toString())
                  trigger("amount")
                }}
              />
            )}

            {/* Converted Amount Preview */}
            {toAmount && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Você receberá</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatAmountWithCurrency(Number(toAmount), toCurrency)}
                </div>
              </div>
            )}
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleSubmit(handleFromAmountContinue),
            disabled: !isValid || !watchedAmount
          }}
        />
      </div>
    )
  }

  // To Amount Confirmation Step
  if (currentStep === "toAmount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Confirmar Conversão"
            subtitle="Verifique os detalhes da conversão"
            onBack={handleBack}
          />

          <ConfirmationSection title="Detalhes da Conversão">
            <ConfirmationRow
              label="Você está convertendo"
              value={formatAmountWithCurrency(Number(fromAmount), fromCurrency)}
            />
            <ConfirmationRow
              label="Você receberá"
              value={formatAmountWithCurrency(Number(toAmount), toCurrency)}
              highlight
            />
            <ConfirmationRow
              label="Taxa de câmbio"
              value={`1 ${fromCurrency} = ${currentRate?.rate.toLocaleString()} ${toCurrency}`}
            />
            <ConfirmationRow
              label="Taxa de conversão"
              value="Gratuita"
            />
          </ConfirmationSection>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleToAmountContinue
          }}
        />
      </div>
    )
  }

  // Final Confirmation Step
  if (currentStep === "confirmation") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Confirmar Conversão"
            subtitle="Revise e confirme sua conversão"
            onBack={handleBack}
          />

          <ConfirmationSection title="Resumo Final">
            <ConfirmationRow
              label="De"
              value={formatAmountWithCurrency(Number(fromAmount), fromCurrency)}
            />
            <ConfirmationRow
              label="Para"
              value={formatAmountWithCurrency(Number(toAmount), toCurrency)}
              highlight
            />
            <ConfirmationRow
              label="Taxa aplicada"
              value={`1 ${fromCurrency} = ${currentRate?.rate.toLocaleString()} ${toCurrency}`}
            />
          </ConfirmationSection>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> A conversão será processada imediatamente e não pode ser desfeita.
            </p>
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Confirmar Conversão",
            onClick: handleConfirmConvert
          }}
        />
      </div>
    )
  }

  // Success Step
  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Conversão realizada!"
        subtitle={`Você converteu ${formatAmountWithCurrency(Number(fromAmount), fromCurrency)} para ${formatAmountWithCurrency(Number(toAmount), toCurrency)}`}
        primaryAction={{
          label: "Voltar ao Dashboard",
          onClick: handleSuccess
        }}
      />
    )
  }

  return null
}
