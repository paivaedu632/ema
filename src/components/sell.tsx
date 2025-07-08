"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"


import {
  TRANSACTION_LIMITS,
  VALIDATION_MESSAGES,
  type Currency
} from "@/utils/transaction-validation"


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
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [desiredAmountError, setDesiredAmountError] = useState("")
  const [useAutomaticRate, setUseAutomaticRate] = useState(true)
  const [dynamicRateInfo, setDynamicRateInfo] = useState<any>(null)
  const [dynamicRateLoading, setDynamicRateLoading] = useState(false)

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // Calculate exchange rate from user inputs (always in AOA per EUR format)
  const calculateExchangeRate = (): number => {
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
  }

  // Calculate the amount user will receive
  const calculateUserReceiveAmount = (): { amount: number; currency: string } => {
    const sellAmount = Number(watchedAmount) || 0
    
    if (useAutomaticRate && dynamicRateInfo) {
      // Use dynamic rate
      const rate = dynamicRateInfo.rate // This is in AOA per EUR format
      
      if (watchedCurrency === "EUR") {
        // User selling EUR, will receive AOA
        return {
          amount: sellAmount * rate,
          currency: "AOA"
        }
      } else {
        // User selling AOA, will receive EUR
        return {
          amount: sellAmount / rate,
          currency: "EUR"
        }
      }
    } else {
      // Use manual rate based on desired amount
      const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"
      return {
        amount: Number(desiredAmount) || 0,
        currency: receiveCurrency
      }
    }
  }

  // Validate desired amount and convert rate limits to user-friendly receive amount limits
  const validateDesiredAmount = (amount: string): string => {
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
          return `Mínimo: ${minReceive.toLocaleString('pt-AO')} ${receiveCurrency}`
        }
        if (desiredAmountNum > maxReceive) {
          return `Máximo: ${maxReceive.toLocaleString('pt-AO')} ${receiveCurrency}`
        }
      } else {
        // User selling AOA, wants EUR
        // Min rate 500 AOA/EUR means max receive = sellAmount / 500
        // Max rate 2000 AOA/EUR means min receive = sellAmount / 2000
        const minReceive = sellAmount / 2000
        const maxReceive = sellAmount / 500

        if (desiredAmountNum < minReceive) {
          return `Mínimo: ${minReceive.toLocaleString('pt-PT')} ${receiveCurrency}`
        }
        if (desiredAmountNum > maxReceive) {
          return `Máximo: ${maxReceive.toLocaleString('pt-PT')} ${receiveCurrency}`
        }
      }
    }

    return ""
  }

  // Calculate the exchange rate for display (always show in "AOA per EUR" format)
  const getCalculatedExchangeRate = (): string => {
    const rate = calculateExchangeRate()

    if (rate === 0) {
      return "Taxa não calculada"
    }

    return `1 EUR = ${rate.toFixed(2)} AOA`
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

      // Use Zod resolver with dynamic schema
      return resolver(data, context, options)
    },
    mode: "onChange",
    defaultValues: {
      amount: "",
      currency: "AOA"
    }
  })

  const { watch, setValue, formState: { errors, isValid } } = form
  const watchedCurrency = watch("currency")
  const watchedAmount = watch("amount")

  // Update form validation when currency or balance changes
  useEffect(() => {
    // Clear errors and re-validate when currency or balance changes
    form.clearErrors()

    // Re-validate current amount with new currency/balance context
    if (watchedAmount) {
      form.trigger("amount")
    }
  }, [watchedCurrency, walletBalances, form, watchedAmount])

  // Fetch wallet balances on component mount
  useEffect(() => {
    const fetchWalletBalances = async () => {
      try {
        const response = await fetch('/api/wallet/balances')
        if (response.ok) {
          const result = await response.json()
          setWalletBalances(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching wallet balances:', error)
      } finally {
        setBalancesLoading(false)
      }
    }

    fetchWalletBalances()
  }, [])

  // Validate desired amount when it changes
  useEffect(() => {
    if (desiredAmount && watchedAmount) {
      const error = validateDesiredAmount(desiredAmount)
      setDesiredAmountError(error)
    } else {
      setDesiredAmountError("")
    }
  }, [desiredAmount, watchedAmount, watchedCurrency])



  // Format balance for display
  const getFormattedBalance = (): string => {
    const currentWallet = walletBalances.find(wallet => wallet.currency === watchedCurrency)
    if (!currentWallet) return `0.00 ${watchedCurrency}`
    return `${currentWallet.available_balance.toFixed(2)} ${watchedCurrency}`
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

  // Fetch dynamic exchange rate
  const fetchDynamicRate = async () => {
    if (!watchedCurrency) return

    setDynamicRateLoading(true)
    try {
      const response = await fetch(`/api/exchange/dynamic-rates?currency=${watchedCurrency}&includeDetails=true`)
      if (response.ok) {
        const result = await response.json()
        setDynamicRateInfo(result.data)
      }
    } catch (error) {
      console.error('Error fetching dynamic rate:', error)
    } finally {
      setDynamicRateLoading(false)
    }
  }

  // Fetch dynamic rate when currency changes
  useEffect(() => {
    if (currentStep === "rateSelection") {
      fetchDynamicRate()
    }
  }, [currentStep, watchedCurrency])

  const handleConfirmSell = async () => {
    if (!isValid) return

    const formData = form.getValues()
    const sellAmount = Number(formData.amount)

    // Determine exchange rate and dynamic rate flag
    let apiExchangeRate: number
    let useDynamicRate: boolean

    if (useAutomaticRate && dynamicRateInfo) {
      // Use dynamic VWAP rate
      apiExchangeRate = dynamicRateInfo.rate
      useDynamicRate = true
    } else {
      // Use user-calculated rate from desired amount
      apiExchangeRate = calculateExchangeRate()
      useDynamicRate = false

      // Final validation for manual rates
      const validationError = validateDesiredAmount(desiredAmount)
      if (validationError) {
        alert(`Erro de validação: ${validationError}`)
        return
      }
    }

    const requestData = {
      amount: sellAmount,
      currency: formData.currency,
      exchangeRate: apiExchangeRate,
      useDynamicRate
    }


    try {
      const response = await fetch('/api/transactions/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        // Offer created successfully, go to success screen
        setCurrentStep("success")
      } else {
        // Handle transaction error
        console.error('Sell offer creation failed:', result.error)
        alert(`Erro na criação da oferta: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing sell offer:', error)
      alert('Erro ao processar oferta. Tente novamente.')
    }
  }

  const handleShare = () => {
    // TODO: Handle share functionality
  }

  const handleBackToHome = () => {
    // Navigate back to dashboard
    router.push("/")
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
            title={`Quanto você quer receber em ${receiveCurrency}?`}
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
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Você vende</span>
              <span className="text-sm font-medium text-gray-900">
                {Number(watchedAmount || 0).toLocaleString(watchedCurrency === "EUR" ? "pt-PT" : "pt-AO")} {watchedCurrency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Você recebe</span>
              <span className="text-sm font-medium text-gray-900">
                {Number(desiredAmount || 0).toLocaleString(receiveCurrency === "EUR" ? "pt-PT" : "pt-AO")} {receiveCurrency}
              </span>
            </div>
          </div>
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
    const receiveAmount = calculateUserReceiveAmount()
    
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Melhor oferta:"
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      useAutomaticRate ? 'border-black bg-black' : 'border-gray-300'
                    }`}>
                      {useAutomaticRate && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">Aceitar</h3>
                    <span className="text-xs bg-gray-800 text-gray-100 px-2 py-1 rounded-full">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Você recebe [best available rateAmount]
                  </p>
                      <p className="text-xs text-gray-500">
                    Atualizamos o valor pra você vender mais rápido e com melhor cambio.
                  </p>
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      !useAutomaticRate ? 'border-black bg-black' : 'border-gray-300'
                    }`}>
                      {!useAutomaticRate && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">Recusar</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Você recebe exatamente {receiveAmount.amount.toLocaleString(receiveAmount.currency === "EUR" ? "pt-PT" : "pt-AO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} {receiveAmount.currency}
                  </p>
                  <p className="text-xs text-gray-500">
                    1. Seu valor ficará reservado até encontrarmos um comprador. Mas você pode retirar sempre que quiser.
                    2. Após a venda, o valor será depositado em [euros] na sua conta. Não fazemos devolução!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleRateSelectionContinue,
            disabled: useAutomaticRate ? dynamicRateLoading || !dynamicRateInfo : false
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
          onClick: handleShare
        }}
        secondaryAction={{
          label: "Voltar ao início",
          onClick: handleBackToHome
        }}
        className="bg-gray-50"
      />
    )
  }

  // Calculate received amount for confirmation step using user-derived rate
  const calculateConfirmationReceivedAmount = (): { amount: string; currency: string } => {
    const desiredAmountNum = Number(desiredAmount) || 0
    const receiveCurrency = watchedCurrency === "EUR" ? "AOA" : "EUR"

    if (desiredAmountNum === 0) {
      return { amount: "0.00", currency: receiveCurrency }
    }

    // Simply return the desired amount that user specified
    return {
      amount: desiredAmountNum.toLocaleString(receiveCurrency === "EUR" ? "pt-PT" : "pt-AO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      currency: receiveCurrency
    }
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
            <ConfirmationRow label="Você vende" value={`${Number(watchedAmount).toLocaleString()} ${watchedCurrency}`} highlight/>
            <ConfirmationRow label="Câmbio" value={getCalculatedExchangeRate()} />
            {/* Show received amount (always show since we now have user-derived rates) */}
            <ConfirmationRow
              label="Você recebe"
              value={(() => {
                const received = calculateConfirmationReceivedAmount()
                return `${received.amount} ${received.currency}`
              })()}
              highlight
            />
          </ConfirmationSection>

          {/* Warning - Conditional based on rate type */}
          <ConfirmationWarning>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="label-form">Seu valor ficará reservado até encontrarmos um comprador. Mas você pode retirar sempre que quiser.</p>
              <p className="label-form">Após a venda, o valor será depositado em euros na sua conta. Não fazemos devolução!</p>
            </div>
          </ConfirmationWarning>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Confirmar",
          onClick: handleConfirmSell
        }}
      />
    </div>
  )
}