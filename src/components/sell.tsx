"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Bot, Wrench, ArrowUpDown } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { OptionSelector } from "@/components/ui/option-selector"
import {
  TRANSACTION_LIMITS,
  VALIDATION_MESSAGES,
  EXCHANGE_RATE_VALIDATION,
  type Currency,
  validateExchangeRateRange
} from "@/utils/transaction-validation"


type Step = "amount" | "rateType" | "manualRate" | "confirmation" | "success"

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
  const [exchangeRate, setExchangeRate] = useState("")
  const [rateType, setRateType] = useState<"automatic" | "manual">("automatic")
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)

  // Banco BAI API state
  const [bancoBaiRate, setBancoBaiRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // Fetch current exchange rate from Banco BAI API
  const fetchBancoBaiRate = async () => {
    setRateLoading(true)

    try {
      const response = await fetch('/api/exchange-rate/banco-bai')

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Convert to EUR to AOA rate (buyValue is AOA per EUR)
        setBancoBaiRate(result.data.buyValue)
      } else {
        console.warn("Failed to fetch Banco BAI rate, using fallback")
        setBancoBaiRate(EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA)
      }
    } catch (error) {
      console.error('Error fetching Banco BAI rate:', error)
      setBancoBaiRate(EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA)
    } finally {
      setRateLoading(false)
    }
  }

  // React Hook Form setup with dynamic schema
  const form = useForm<SellAmountForm>({
    resolver: zodResolver(createSellAmountSchema(getCurrentBalance("AOA"), "AOA")),
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

  // Fetch Banco BAI rate when entering manual rate step
  useEffect(() => {
    if (currentStep === "manualRate") {
      fetchBancoBaiRate()
    }
  }, [currentStep])

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
    if (currentStep === "rateType") {
      setCurrentStep("amount")
    } else if (currentStep === "manualRate") {
      setCurrentStep("rateType")
    } else if (currentStep === "confirmation") {
      if (rateType === "manual") {
        setCurrentStep("manualRate")
      } else {
        setCurrentStep("rateType")
      }
    } else if (currentStep === "success") {
      router.push("/")
    }
  }

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep("rateType")
    }
  }

  const handleRateTypeSelect = (type: "automatic" | "manual") => {
    setRateType(type)
    if (type === "automatic") {
      setCurrentStep("confirmation")
    } else {
      setCurrentStep("manualRate")
    }
  }

  const handleManualRateContinue = () => {
    setCurrentStep("confirmation")
  }

  const handleConfirmSell = async () => {
    if (!isValid) return

    const formData = form.getValues()

    // Convert exchange rate to the format expected by API
    // API expects: 1 EUR = X AOA (simplified format)
    let apiExchangeRate: number
    if (rateType === "manual") {
      // Manual rate is entered as "X AOA per 100 EUR" in the UI
      // Convert to "1 EUR = Y AOA" format: Y = X / 100
      apiExchangeRate = Number(exchangeRate) / 100
    } else {
      // Automatic rates using shared constants (1 EUR = X AOA format)
      apiExchangeRate = EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA
    }

    const requestData = {
      amount: Number(formData.amount), // Convert string to number for API
      currency: formData.currency,
      exchangeRate: apiExchangeRate
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

  if (currentStep === "rateType") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Como você quer o câmbio?"
            onBack={handleBack}
          />

          <div className="mb-8">
            <OptionSelector
              items={[
                {
                  id: "automatic",
                  title: "Automático",
                  description: "Venda mais rápido e com melhor preço.",
                  icon: Bot,
                  onClick: () => handleRateTypeSelect("automatic")
                },
                {
                  id: "manual",
                  title: "Manual",
                  description: "Você controla o câmbio.",
                  icon: Wrench,
                  onClick: () => handleRateTypeSelect("manual")
                }
              ]}
            />
          </div>
        </main>
      </div>
    )
  }

  if (currentStep === "manualRate") {
    // Get placeholder text - fixed at 100 EUR base
    const getPlaceholderText = () => {
      if (rateLoading) return "Carregando..."
      if (bancoBaiRate) return (bancoBaiRate * 100).toFixed(2)
      return (EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA * 100).toFixed(2)
    }

    // Validate exchange rate input using shared validation utilities
    const validateManualRate = (value: string): string => {
      if (!value || value.trim() === "") return ""

      const num = Number(value)
      if (isNaN(num) || num <= 0) {
        return VALIDATION_MESSAGES.EXCHANGE_RATE.INVALID
      }

      // Convert user input from 100 EUR base to 1 EUR base for validation
      // This matches the format that will be sent to the backend
      const rateIn1EurBase = num / 100

      // Enhanced range validation based on Banco BAI rate (using 1 EUR base format)
      if (bancoBaiRate) {
        const baselineRate = bancoBaiRate // Already in 1 EUR base format
        const validation = validateExchangeRateRange(
          rateIn1EurBase,
          baselineRate,
          EXCHANGE_RATE_VALIDATION.FRONTEND_MARGIN
        )

        if (!validation.isValid) {
          return validation.error || VALIDATION_MESSAGES.EXCHANGE_RATE.OUT_OF_RANGE
        }
      } else {
        // Fallback range validation using fallback rate (already in 1 EUR base format)
        const fallbackRate = EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA
        const validation = validateExchangeRateRange(
          rateIn1EurBase,
          fallbackRate,
          EXCHANGE_RATE_VALIDATION.FRONTEND_MARGIN
        )

        if (!validation.isValid) {
          return validation.error || VALIDATION_MESSAGES.EXCHANGE_RATE.OUT_OF_RANGE
        }
      }

      return ""
    }

    const validationError = validateManualRate(exchangeRate)

    // Calculate the amount user will receive
    const calculateReceivedAmount = (): { amount: string; currency: string } => {
      const sellAmount = Number(watchedAmount) || 0
      const rate = Number(exchangeRate) || 0

      if (sellAmount === 0 || rate === 0 || validationError) {
        return { amount: "0.00", currency: watchedCurrency === "AOA" ? "EUR" : "AOA" }
      }

      if (watchedCurrency === "AOA") {
        // User is selling AOA to receive EUR
        // Rate is entered as "X AOA per 100 EUR"
        // Calculate EUR equivalent: (AOA Amount / Rate) * 100
        const eurAmount = (sellAmount / rate) * 100

        return {
          amount: eurAmount.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "EUR"
        }
      } else {
        // User is selling EUR to receive AOA
        // Rate is entered as "X AOA per 100 EUR"
        // Calculate AOA equivalent: (EUR Amount * Rate) / 100
        const aoaAmount = (sellAmount * rate) / 100

        return {
          amount: aoaAmount.toLocaleString('pt-AO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "AOA"
        }
      }
    }

    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Digite o câmbio"
            onBack={handleBack}
          />

          {/* Two-Input Exchange Rate Design */}
          <div className="space-y-4 mb-6">
            {/* AOA Input (Top) */}
            <div className="relative">
              <input
                type="text"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder={getPlaceholderText()}
                className={`w-full h-16 px-4 text-2xl font-bold rounded-2xl border-2 focus:outline-none transition-colors bg-white ${
                  validationError
                    ? 'border-red-700 focus:border-red-700'
                    : 'border-gray-300 focus:border-black'
                }`}
              />
              {/* AOA Currency Label with Real Flag */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <img
                  src="https://flagicons.lipis.dev/flags/4x3/ao.svg"
                  alt="Angola flag"
                  className="w-6 h-6 rounded-sm"
                />
                <span className="text-lg font-semibold text-gray-700">AOA</span>
              </div>
            </div>

            {/* Validation Error - Below AOA Input */}
            {validationError && (
              <p className="form-error-ema -mt-2 mb-2">{validationError}</p>
            )}

            {/* Conversion Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white">
                <ArrowUpDown className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            {/* EUR Input (Bottom) */}
            <div className="relative">
              <input
                type="text"
                value="100"
                readOnly
                className="w-full h-16 px-4 text-2xl font-bold rounded-2xl border-2 border-gray-300 bg-gray-50 text-gray-600"
              />
              {/* EUR Currency Label with Real Flag */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <img
                  src="https://flagicons.lipis.dev/flags/4x3/eu.svg"
                  alt="European Union flag"
                  className="w-6 h-6 rounded-sm"
                />
                <span className="text-lg font-semibold text-gray-700">EUR</span>
              </div>
            </div>
          </div>

          {/* Exchange Rate and Transaction Display */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Você vende</span>
              <span className="text-sm font-medium text-gray-900">
                {Number(watchedAmount).toLocaleString('pt-AO')} AOA
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Câmbio</span>
              <span className="text-sm font-medium text-gray-900">
                {bancoBaiRate ? `100 EUR = ${(bancoBaiRate * 100).toFixed(2)} AOA` : `100 EUR = ${(EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA * 100).toFixed(2)} AOA`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Você recebe</span>
              <span className="text-sm font-medium text-gray-900">
                {(() => {
                  const received = calculateReceivedAmount()
                  return `${received.amount} ${received.currency}`
                })()}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {rateLoading && (
            <p className="text-center text-sm text-gray-500 mb-4">Carregando taxa atual...</p>
          )}
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleManualRateContinue,
            disabled: !exchangeRate || validationError !== "" || rateLoading
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

  // Calculate received amount for confirmation step
  const calculateConfirmationReceivedAmount = (): { amount: string; currency: string } => {
    const sellAmount = Number(watchedAmount) || 0

    if (sellAmount === 0) {
      return { amount: "0.00", currency: watchedCurrency === "AOA" ? "EUR" : "AOA" }
    }

    if (rateType === "manual") {
      const rate = Number(exchangeRate) || 0
      if (rate === 0) {
        return { amount: "0.00", currency: watchedCurrency === "AOA" ? "EUR" : "AOA" }
      }

      if (watchedCurrency === "AOA") {
        // User is selling AOA to receive EUR
        // Rate is entered as "X AOA per 100 EUR"
        // Calculate EUR equivalent: (AOA Amount / Rate) * 100
        const eurAmount = (sellAmount / rate) * 100

        return {
          amount: eurAmount.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "EUR"
        }
      } else {
        // User is selling EUR to receive AOA
        // Rate is entered as "X AOA per 100 EUR"
        // Calculate AOA equivalent: (EUR Amount * Rate) / 100
        const aoaAmount = (sellAmount * rate) / 100

        return {
          amount: aoaAmount.toLocaleString('pt-AO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "AOA"
        }
      }
    } else {
      // Automatic rate calculation (future implementation)
      const fallbackRate = EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA

      if (watchedCurrency === "AOA") {
        const eurAmount = sellAmount / fallbackRate
        return {
          amount: eurAmount.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "EUR"
        }
      } else {
        const aoaAmount = sellAmount * fallbackRate
        return {
          amount: aoaAmount.toLocaleString('pt-AO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          currency: "AOA"
        }
      }
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
            <ConfirmationRow label="Você vende" value={`${Number(watchedAmount).toLocaleString()} ${watchedCurrency}`} />
            <ConfirmationRow label="Câmbio" value={
              rateType === "manual"
                ? `100 EUR = ${exchangeRate} AOA`
                : `100 EUR = ${(EXCHANGE_RATE_VALIDATION.FALLBACK_RATES.EUR_TO_AOA * 100).toFixed(2)} AOA`
            } />
            {/* Show received amount for manual rates */}
            {rateType === "manual" && (
              <ConfirmationRow
                label="Você recebe"
                value={(() => {
                  const received = calculateConfirmationReceivedAmount()
                  return `${received.amount} ${received.currency}`
                })()}
                highlight
              />
            )}
          </ConfirmationSection>

          {/* Warning - Conditional based on rate type */}
          <ConfirmationWarning>
            <div className="space-y-2 text-sm text-gray-600">
              {rateType === "automatic" && (
                <>
                  <p className="label-form">O Ema Pay atualiza o câmbio automaticamente.</p>
                  <p className="label-form">Por isso, o valor total que você vai receber pode ser diferente.</p>
                </>
              )}
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
