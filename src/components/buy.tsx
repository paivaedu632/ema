"use client"

import { useState, useEffect, useRef } from "react"
import { RefreshCw, Clock, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow } from "@/components/ui/confirmation-section"
import { InfoSection } from "@/components/ui/info-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { TransactionSummary } from "@/components/ui/transaction-summary"
import { useTransactionFlow } from "@/hooks/use-multi-step-flow"
import { calculateFeeAmount, getTransactionSummary } from "@/utils/fee-calculations"

import {
  TRANSACTION_LIMITS,
  VALIDATION_MESSAGES,
  type Currency
} from "@/utils/transaction-validation"
import {
  checkInsufficientBalance,
  shouldDisableComponentsForBalance,
  type InsufficientBalanceState
} from "@/utils/insufficient-balance-utils"
import { InsufficientBalanceError } from "@/components/ui/insufficient-balance-error"

interface WalletBalance {
  currency: Currency
  available_balance: number
  reserved_balance: number
  last_updated: string
}

// Zod validation schema with proper error hierarchy
const createBuyAmountSchema = (availableBalance: number, currency: Currency) => {
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

type BuyAmountForm = z.infer<ReturnType<typeof createBuyAmountSchema>>

export function BuyFlow() {
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)

  const [exchangeRateData, setExchangeRateData] = useState<any>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Insufficient balance state
  const [insufficientBalanceState, setInsufficientBalanceState] = useState<InsufficientBalanceState>({
    hasInsufficientBalance: false,
    errorMessage: null,
    shouldShowDepositButton: false,
    shouldDisableComponents: false
  })

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: Currency): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // React Hook Form setup with dynamic schema
  const form = useForm<BuyAmountForm>({
    resolver: zodResolver(createBuyAmountSchema(getCurrentBalance("EUR"), "EUR")),
    mode: "onChange",
    defaultValues: {
      amount: "",
      currency: "EUR"
    }
  })

  const { watch, setValue, formState: { errors, isValid } } = form
  const watchedCurrency = watch("currency")
  const watchedAmount = watch("amount")

  // Use watched values for compatibility with existing code
  const amount = watchedAmount
  const currency = watchedCurrency

  // Update form schema when currency or balance changes
  useEffect(() => {
    const currentBalance = getCurrentBalance(watchedCurrency)
    const newSchema = createBuyAmountSchema(currentBalance, watchedCurrency)

    // Update the resolver with new schema
    form.clearErrors()
    // Re-validate current amount with new schema
    if (watchedAmount) {
      form.trigger("amount")
    }
  }, [watchedCurrency, walletBalances, form, watchedAmount])

  // Check insufficient balance when amount or currency changes
  useEffect(() => {
    const currentBalance = getCurrentBalance(watchedCurrency)
    const balanceState = checkInsufficientBalance(watchedAmount, currentBalance, watchedCurrency, 'buy')
    setInsufficientBalanceState(balanceState)
  }, [watchedAmount, watchedCurrency, walletBalances])

  // Dynamic exchange rate display with countdown
  const getExchangeRateDisplay = (): string => {
    if (rateLoading) return "Calculando taxa..."

    // Default display based on selected currency
    const defaultDisplay = watchedCurrency === 'EUR'
      ? "1.00 EUR = 924.0675 AOA"
      : "1.00 AOA = 0.0011 EUR"

    if (rateError) return defaultDisplay

    const baseDisplay = exchangeRateData?.exchange_rate
      ? watchedCurrency === 'EUR'
        ? `1.00 EUR = ${exchangeRateData.exchange_rate.toFixed(4)} AOA`
        : `1.00 AOA = ${(1 / exchangeRateData.exchange_rate).toFixed(4)} EUR`
      : defaultDisplay

    // Only show countdown if amount is valid and timer is running
    const shouldShowCountdown = amount && amount !== "0" && !isNaN(Number(amount))
    return shouldShowCountdown ? `${baseDisplay} (${countdown}s)` : baseDisplay
  }

  // Format balance for display based on selected currency
  const getFormattedBalance = (currency: Currency): string => {
    const wallet = walletBalances.find(w => w.currency === currency)
    if (!wallet) return `0.00 ${currency}`
    return `${wallet.available_balance.toFixed(2)} ${currency}`
  }

  // Use reusable transaction flow hook
  const {
    currentStep,
    setStep,
    handleBack,
    handleBackToHome
  } = useTransactionFlow({
    initialStep: "amount",
    steps: ["amount", "confirmation", "success"]
  })

  // Get primary error message - simplified to only form validation
  const getPrimaryErrorMessage = (): string | null => {
    // Form validation errors (balance, amount validation)
    // Note: Insufficient balance is handled separately with deposit button
    if (errors.amount?.message && !insufficientBalanceState.hasInsufficientBalance) {
      return errors.amount.message
    }

    return null
  }

  // Continue button logic - simplified to only form validation and balance checking
  const canContinue = isValid && !insufficientBalanceState.hasInsufficientBalance

  // Use dynamic fee calculation from exchange rate data
  const feeAmount = exchangeRateData?.fee_amount
    ? `${exchangeRateData.fee_amount.toFixed(2)} ${watchedCurrency}`
    : calculateFeeAmount(amount, currency)

  // Calculate the amount user will receive (opposite currency)
  const receiveCurrency = watchedCurrency === 'EUR' ? 'AOA' : 'EUR'
  const receiveAmount = exchangeRateData?.aoa_amount || exchangeRateData?.eur_amount
    ? `${(exchangeRateData.aoa_amount || exchangeRateData.eur_amount).toFixed(2)} ${receiveCurrency}`
    : getTransactionSummary(amount, currency).total

  // Calculate transaction summary for display
  const transactionSummary = getTransactionSummary(amount, currency)

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

  // Fetch exchange rate function
  const fetchExchangeRate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setExchangeRateData(null)
      setRateError(null)
      return
    }

    setRateLoading(true)
    setRateError(null)

    try {
      const response = await fetch('/api/exchange/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: watchedCurrency === 'EUR' ? 'AOA' : 'EUR', // Buy opposite currency
          type: 'buy'
        })
      })

      const result = await response.json()

      if (result.success) {
        setExchangeRateData(result.data)
      } else {
        setRateError(result.error || 'Erro ao calcular taxa')
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      setRateError('Erro de conexão')
    } finally {
      setRateLoading(false)
    }
  }

  // Countdown timer and exchange rate fetching effect
  useEffect(() => {
    // Clear existing timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    // Only start timer if amount is valid
    if (!amount || amount === "0" || isNaN(Number(amount))) {
      setCountdown(10)
      return
    }

    // Initial fetch
    fetchExchangeRate()
    setCountdown(10)

    // Start countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Reset countdown and fetch new rate
          fetchExchangeRate()
          return 10
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [amount, watchedCurrency])

  // Removed complex limit checking logic - keeping only basic validation



  const handleContinue = () => {
    if (currentStep === "amount") {
      setStep("confirmation")
    } else if (currentStep === "confirmation") {
      processBuyTransaction()
    }
  }

  const processBuyTransaction = async () => {
    try {
      // Use the exchange rate from our dynamic calculation
      const exchangeRate = exchangeRateData?.exchange_rate || 924.0675

      const response = await fetch('/api/transactions/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          currency: watchedCurrency,
          exchangeRate: exchangeRate,
          useOrderMatching: exchangeRateData?.rate_source === 'order_matching'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Transaction successful, refresh balances and go to success screen
        await refreshWalletBalances()
        setStep("success")
      } else {
        // Handle transaction error
        console.error('Transaction failed:', result.error)
        alert(`Erro na transação: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing buy transaction:', error)
      alert('Erro ao processar transação. Tente novamente.')
    }
  }

  // Function to refresh wallet balances
  const refreshWalletBalances = async () => {
    try {
      const response = await fetch('/api/wallet/balances')
      if (response.ok) {
        const result = await response.json()
        setWalletBalances(result.data || [])
      }
    } catch (error) {
      console.error('Error refreshing wallet balances:', error)
    }
  }

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer comprar:"
            onBack={handleBack}
          />

          <AmountInput
            amount={watchedAmount}
            currency={watchedCurrency}
            onAmountChange={(value) => setValue("amount", value)}
            onCurrencyChange={(value) => setValue("currency", value as "EUR" | "AOA")}
            transactionType="buy"
            showValidation={false}
            className="mb-6"
            disabled={insufficientBalanceState.shouldDisableComponents}
          />

          {/* Primary validation error - shows highest priority error only */}
          {getPrimaryErrorMessage() && (
            <p className="form-error-ema">{getPrimaryErrorMessage()}</p>
          )}

          {/* Insufficient balance error with deposit button */}
          {insufficientBalanceState.hasInsufficientBalance && (
            <InsufficientBalanceError
              currency={watchedCurrency}
              className="mb-3"
            />
          )}

          {balancesLoading ? (
            <div className="mb-3">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            <AvailableBalance amount={getFormattedBalance(watchedCurrency)} />
          )}

          <div>
            {amount && amount !== "0" && amount !== "" && (
              <div className="mb-8 space-y-4">
                {/* Exchange Rate Section */}
                <InfoSection
                  icon={RefreshCw}
                  label="Câmbio"
                  value={getExchangeRateDisplay()}
                />

                {/* Arrival Time Section */}
                <InfoSection
                  icon={Clock}
                  label="Vai chegar"
                  value="Hoje em segundos"
                />

                {/* Amount You Receive Section - Using Reusable Component */}
                <TransactionSummary
                  icon={Wallet}
                  label="Você recebe"
                  amount={transactionSummary.total}
                  fee={transactionSummary.fee}
                />


              </div>
            )}
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue,
            disabled: !canContinue || balancesLoading || insufficientBalanceState.shouldDisableComponents
          }}
        />
      </div>
    )
  }

  // Step 2: Confirmation
  if (currentStep === "confirmation") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Confirmar compra"
            onBack={handleBack}
          />

          <div className="space-y-6">
            {/* Transaction Details */}
            <ConfirmationSection title="">
              <ConfirmationRow label="Seu saldo" value={getFormattedBalance(watchedCurrency)} />
              <ConfirmationRow label="Compra" value={`${amount} ${watchedCurrency}`} />
              <ConfirmationRow label="Taxa" value={feeAmount} />
              <ConfirmationRow label="Você recebe" value={receiveAmount} highlight />
              <ConfirmationRow label="Tempo" value="Segundos" />
            </ConfirmationSection>
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Confirmar",
            onClick: handleContinue
          }}
        />
      </div>
    )
  }

  // Step 3: Success
  const successReceiveCurrency = watchedCurrency === 'EUR' ? 'AOA' : 'EUR'
  return (
    <SuccessScreen
      title="Compra confirmada!"
      message={`Você comprou ${amount} ${watchedCurrency} e recebeu ${successReceiveCurrency} na sua carteira.`}
      primaryAction={{
        label: "Voltar ao início",
        onClick: handleBackToHome
      }}
    />
  )
}
