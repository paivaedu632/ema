"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Bot, Settings } from "lucide-react"

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

type Step = "amount" | "desiredAmount" | "rateSelection" | "confirmation" | "success"

interface WalletBalance {
  currency: Currency
  available_balance: number
  reserved_balance: number
  last_updated: string
}

// Zod validation schema using shared validation utilities
const createSellAmountSchema = (availableBalance: number, currency: Currency) => {
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
      }),
    currency: z.enum(["EUR", "AOA"])
  })
}

type SellAmountForm = z.infer<ReturnType<typeof createSellAmountSchema>>

export function SellFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [desiredAmount, setDesiredAmount] = useState("")
  // Static wallet balances for visual representation
  const walletBalances: WalletBalance[] = useMemo(() => [
    { currency: 'EUR', available_balance: 1250.75, reserved_balance: 0.00, last_updated: new Date().toISOString() },
    { currency: 'AOA', available_balance: 485000.00, reserved_balance: 15000.00, last_updated: new Date().toISOString() }
  ], [])
  const [balancesLoading] = useState(false)
  const [desiredAmountError, setDesiredAmountError] = useState("")
  const [useAutomaticRate, setUseAutomaticRate] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // React Hook Form setup with custom resolver
  const form = useForm<SellAmountForm>({
    resolver: async (data, context, options) => {
      // Get current currency from form data
      const currency = (data.currency as Currency) || "AOA"
      const currentBalance = getCurrentBalance(currency)

      // Create schema with current currency and balance
      const schema = createSellAmountSchema(currentBalance, currency)
      const resolver = zodResolver(schema)

      return resolver(data, context, options)
    },
    defaultValues: {
      currency: "AOA",
      amount: ""
    }
  })

  const { watch, setValue, formState: { errors, isValid } } = form
  const watchedCurrency = watch("currency")
  const watchedAmount = watch("amount")

  // Calculate exchange rate from user inputs (always in AOA per EUR format)
  const calculateExchangeRate = useCallback((): number => {
    const sellAmount = Number(watchedAmount) || 0
    const desiredAmountNum = Number(desiredAmount) || 0

    if (sellAmount === 0 || desiredAmountNum === 0) {
      return 0
    }

    if (watchedCurrency === "EUR") {
      // User is selling EUR, wants AOA
      // Rate = AOA_desired / EUR_to_sell (AOA per EUR)
      return desiredAmountNum / sellAmount
    } else {
      // User is selling AOA, wants EUR
      // Convert to AOA per EUR format: AOA_to_sell / EUR_desired
      return sellAmount / desiredAmountNum
    }
  }, [watchedAmount, desiredAmount, watchedCurrency])



  // Validate desired amount and convert rate limits to user-friendly receive amount limits
  const validateDesiredAmount = useCallback((amount: string): string => {
    const sellAmount = Number(watchedAmount) || 0
    const desiredAmountNum = Number(amount) || 0

    if (sellAmount === 0 || desiredAmountNum === 0) {
      return ""
    }

    // Calculate the exchange rate that would result from this desired amount
    const rate = calculateExchangeRate()

    // Check if rate is in reasonable range (500-2000 AOA per EUR)
    // Convert these rate limits back to receive amount limits for user guidance
    if (rate < 500 || rate > 2000) {
      const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"

      if (watchedCurrency === "EUR") {
        // User selling EUR, wants AOA
        // Min rate 500 AOA/EUR means min receive = sellAmount * 500
        // Max rate 2000 AOA/EUR means max receive = sellAmount * 2000
        const minReceive = sellAmount * 500
        const maxReceive = sellAmount * 2000

        if (desiredAmountNum < minReceive) {
          return `Mínimo: ${formatAmountWithCurrency(minReceive, receiveCurrency as Currency)}`
        }
        if (desiredAmountNum > maxReceive) {
          return `Máximo: ${formatAmountWithCurrency(maxReceive, receiveCurrency as Currency)}`
        }
      } else {
        // User selling AOA, wants EUR
        // Min rate 500 AOA/EUR means max receive = sellAmount / 500
        // Max rate 2000 AOA/EUR means min receive = sellAmount / 2000
        const minReceive = sellAmount / 2000
        const maxReceive = sellAmount / 500

        if (desiredAmountNum < minReceive) {
          return `Mínimo: ${formatAmountWithCurrency(minReceive, receiveCurrency as Currency)}`
        }
        if (desiredAmountNum > maxReceive) {
          return `Máximo: ${formatAmountWithCurrency(maxReceive, receiveCurrency as Currency)}`
        }
      }
    }

    return ""
  }, [watchedAmount, watchedCurrency, calculateExchangeRate])

  // Calculate the exchange rate for display (always show in "AOA per EUR" format)
  const getCalculatedExchangeRate = (): string => {
    // If automatic rate is selected, show "Automático"
    if (useAutomaticRate) {
      return "Automático"
    }

    // For manual rate, show "Manual" instead of calculated rate
    return "Manual"
  }





  // Handle sell order placement via order book API
  const handleConfirmSell = async () => {
    setIsProcessing(true)

    try {
      const formData = form.getValues()
      const sellAmount = Number(formData.amount)
      const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"

      // Calculate price based on user's desired receive amount
      // Price is always in quote currency per base currency
      const price = watchedCurrency === "EUR"
        ? Number(desiredAmount) / sellAmount  // AOA per EUR
        : sellAmount / Number(desiredAmount)  // EUR per AOA (inverted)

      const requestData = {
        side: "sell" as const,
        type: useAutomaticRate ? "market" as const : "limit" as const,
        base_currency: watchedCurrency,
        quote_currency: receiveCurrency,
        quantity: sellAmount,
        ...(useAutomaticRate ? {} : { price }),
        dynamic_pricing_enabled: useAutomaticRate
      }

      console.log('Placing sell order:', requestData)

      // TODO: Replace with real API call when clean architecture APIs are implemented
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Simulate successful order placement (95% success rate)
      const success = Math.random() > 0.05

      if (success) {
        console.log('Sell order placed successfully (simulated)')
        setCurrentStep("success")
      } else {
        alert('Erro na criação da ordem: Taxa de câmbio inválida. Tente novamente.')
      }
    } catch (error) {
      console.error('Error processing sell order:', error)
      alert('Erro ao processar ordem. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Update form validation when currency or balance changes
  useEffect(() => {
    // Clear errors and re-validate when currency or balance changes
    form.clearErrors()

    // Re-validate current amount with new currency/balance context
    if (watchedAmount) {
      form.trigger("amount")
    }
  }, [watchedCurrency, walletBalances, form, watchedAmount])

  // TODO: Add useEffect here to fetch real wallet balances when clean architecture APIs are implemented

  // Validate desired amount when it changes
  useEffect(() => {
    if (desiredAmount && watchedAmount) {
      const error = validateDesiredAmount(desiredAmount)
      setDesiredAmountError(error)
    } else {
      setDesiredAmountError("")
    }
  }, [desiredAmount, watchedAmount, watchedCurrency, validateDesiredAmount])

  // Format balance for display
  const getFormattedBalance = (): string => {
    const currentWallet = walletBalances.find(wallet => wallet.currency === watchedCurrency)
    if (!currentWallet) return formatAmountWithCurrency(0, watchedCurrency as Currency)
    return formatAmountWithCurrency(currentWallet.available_balance, watchedCurrency as Currency)
  }

  const handleBackToDashboard = () => {
    router.push("/")
  }

  const handleBack = () => {
    if (currentStep === "desiredAmount") {
      setCurrentStep("amount")
    } else if (currentStep === "rateSelection") {
      setCurrentStep("desiredAmount")
    } else if (currentStep === "confirmation") {
      setCurrentStep("rateSelection")
    } else if (currentStep === "success") {
      router.push("/")
    }
  }

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep("desiredAmount")
    }
  }

  const handleDesiredAmountContinue = () => {
    setCurrentStep("rateSelection")
  }

  const handleRateSelectionContinue = () => {
    setCurrentStep("confirmation")
  }

  // Get the primary error message (first error from form)
  const getPrimaryErrorMessage = (): string => {
    if (errors.amount?.message) {
      return errors.amount.message
    }
    return ""
  }

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer vender?"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={watchedAmount}
            currency={watchedCurrency}
            onAmountChange={(value) => setValue("amount", value)}
            onCurrencyChange={(value) => setValue("currency", value as "EUR" | "AOA")}
            transactionType="sell"
            showValidation={false}
            className="mb-3"
          />

          {/* Primary validation error - shows highest priority error only */}
          {getPrimaryErrorMessage() && (
            <p className="form-error-ema">{getPrimaryErrorMessage()}</p>
          )}

          {balancesLoading ? (
            <div className="mb-3">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            <AvailableBalance amount={getFormattedBalance()} />
          )}

        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue,
            disabled: !isValid || balancesLoading
          }}
        />
      </div>
    )
  }

  if (currentStep === "desiredAmount") {
    // Determine the opposite currency for what user wants to receive
    const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"

    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title={`Quanto você quer receber?`}
            onBack={handleBack}
          />

          <AmountInput
            amount={desiredAmount}
            currency={receiveCurrency}
            onAmountChange={(value) => setDesiredAmount(value)}
            onCurrencyChange={() => {}} // Currency is fixed based on what user is selling
            transactionType="sell"
            showValidation={false}
            className="mb-3"
            availableCurrencies={[
              { code: receiveCurrency, flag: receiveCurrency === "EUR" ? "eu" : "ao" }
            ]}
          />

          {/* Validation Error - User-friendly receive amount limits */}
          {desiredAmountError && (
            <p className="form-error-ema mb-3">{desiredAmountError}</p>
          )}

          {/* Transaction Summary */}
          <ConfirmationSection title="">
            <ConfirmationRow
              label="Você vende"
              value={formatAmountWithCurrency(watchedAmount || 0, watchedCurrency as Currency)}
            />
            <ConfirmationRow
              label="Você recebe"
              value={formatAmountWithCurrency(desiredAmount || 0, receiveCurrency as Currency)}
            />
          </ConfirmationSection>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleDesiredAmountContinue,
            disabled: !desiredAmount || Number(desiredAmount) <= 0 || !!desiredAmountError
          }}
        />
      </div>
    )
  }

  if (currentStep === "rateSelection") {
    const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"
    const formattedReceiveAmount = formatAmountForInput(desiredAmount, receiveCurrency as Currency)

    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Qual câmbio você prefere?"
            onBack={handleBack}
          />

          <div className="space-y-4 mb-6">
            {/* Automatic Rate Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                useAutomaticRate
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setUseAutomaticRate(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Automático</h3>
                  <p className="text-sm text-gray-600">
                    Venda mais rápido e com melhor preço.
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  useAutomaticRate ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {useAutomaticRate && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Rate Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                !useAutomaticRate
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setUseAutomaticRate(false)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Manual</h3>
                  <p className="text-sm text-gray-600">
                    Você recebe exatamente {formattedReceiveAmount} {receiveCurrency}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  !useAutomaticRate ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {!useAutomaticRate && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleRateSelectionContinue
          }}
        />
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Venda publicada!"
        message="Compartilhe seu anúncio e venda mais rápido."
        primaryAction={{
          label: "Compartilhar",
          onClick: () => {}
        }}
        secondaryAction={{
          label: "Voltar ao início",
          onClick: () => router.push("/")
        }}
        className="bg-gray-50"
      />
    )
  }



  // Step 4: Confirmation
  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Confirmar venda"
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Transaction Details */}
          <ConfirmationSection title="">
            <ConfirmationRow label="Seu saldo" value={getFormattedBalance()} />
            <ConfirmationRow label="Você vende" value={formatAmountWithCurrency(watchedAmount, watchedCurrency as Currency)} highlight/>
            <ConfirmationRow label="Câmbio" value={getCalculatedExchangeRate()} />
            {/* Show received amount (always show since we now have user-derived rates) */}
            <ConfirmationRow
              label="Você recebe"
              value={(() => {
                const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"
                const formattedAmount = formatAmountForInput(Number(desiredAmount) || 0, receiveCurrency as Currency)
                // Add ± symbol for automatic rate to indicate approximate amount
                const prefix = useAutomaticRate ? "±" : ""
                return `${prefix}${formattedAmount} ${receiveCurrency}`
              })()}
              highlight
            />
          </ConfirmationSection>

          {/* Warning */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-900">Atenção:</p>
            <p className="text-sm text-gray-600">
              Seu valor ficará reservado até encontrarmos um comprador. Mas você pode retirar sempre que quiser. Após a venda, o valor será depositado em euros na sua conta. Não fazemos devolução!
            </p>
          </div>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: isProcessing ? "Processando..." : "Confirmar",
          onClick: handleConfirmSell,
          disabled: isProcessing
        }}
      />
    </div>
  )
}

export default SellFlow
