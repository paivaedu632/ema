"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Bot, Wrench } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { OptionSelector } from "@/components/ui/option-selector"


type Step = "amount" | "rateType" | "manualRate" | "confirmation" | "success"

interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available_balance: number
  reserved_balance: number
  last_updated: string
}

// Zod validation schema with proper error hierarchy for sell transactions
const createSellAmountSchema = (availableBalance: number, currency: string) => {
  const limits = {
    EUR: { min: 1, max: 10000 },
    AOA: { min: 1000, max: 5000000 }
  }

  const limit = limits[currency as keyof typeof limits] || limits.EUR

  return z.object({
    amount: z.string()
      .min(1, "Digite um valor")
      .refine((val) => {
        const num = Number(val)
        return !isNaN(num) && num > 0
      }, {
        message: "Digite um valor válido"
      })
      .refine((val) => {
        const num = Number(val)
        return num >= limit.min
      }, {
        message: `Valor mínimo: ${limit.min.toLocaleString()} ${currency}`
      })
      .refine((val) => {
        const num = Number(val)
        return num <= limit.max
      }, {
        message: `Valor máximo: ${limit.max.toLocaleString()} ${currency}`
      })
      .refine((val) => {
        const num = Number(val)
        return num <= availableBalance
      }, {
        message: "Seu saldo não é suficiente"
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
  const [rateError, setRateError] = useState<string>("")

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // Fetch current exchange rate from Banco BAI API
  const fetchBancoBaiRate = async () => {
    setRateLoading(true)
    setRateError("")

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
        setRateError("Não foi possível obter a taxa atual")
        setBancoBaiRate(924.50) // Fallback rate
      }
    } catch (error) {
      console.error('Error fetching Banco BAI rate:', error)
      setRateError("Erro ao buscar taxa atual")
      setBancoBaiRate(924.50) // Fallback rate
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
    // API expects: 1 [currency_type] = X [other_currency]
    let apiExchangeRate: number
    if (rateType === "manual") {
      // Manual rate is always entered as EUR to AOA (1 EUR = X AOA)
      if (formData.currency === "AOA") {
        // User entered "1 EUR = X AOA", API expects "1 AOA = Y EUR"
        // Convert: if 1 EUR = 924 AOA, then 1 AOA = 1/924 EUR
        apiExchangeRate = 1 / Number(exchangeRate)
      } else {
        // User entered "1 EUR = X AOA", API expects "1 EUR = Y AOA"
        // Use the rate directly
        apiExchangeRate = Number(exchangeRate)
      }
    } else {
      // Automatic rates in correct API format
      apiExchangeRate = formData.currency === "AOA" ? 0.001082 : 924.0675
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
    // Get placeholder text based on Banco BAI rate
    const getPlaceholderText = () => {
      if (rateLoading) return "Carregando..."
      if (bancoBaiRate) return `Ex: ${bancoBaiRate.toFixed(2)}`
      return "Ex: 924.50"
    }

    // Get rate reference text
    const getRateReferenceText = () => {
      if (rateLoading) return "Carregando taxa atual..."
      if (rateError) return rateError
      if (bancoBaiRate) return `Taxa atual: 1 EUR = ${bancoBaiRate.toFixed(2)} AOA`
      return "Taxa atual: 1 EUR = 924.50 AOA"
    }

    // Validate exchange rate input with enhanced range checking
    const validateManualRate = (value: string): string => {
      if (!value || value.trim() === "") return ""

      const num = Number(value)
      if (isNaN(num) || num <= 0) {
        return "Digite uma taxa válida"
      }

      // Enhanced range validation based on Banco BAI rate
      if (bancoBaiRate) {
        // Allow ±20% margin from Banco BAI rate
        const minRate = bancoBaiRate * 0.8
        const maxRate = bancoBaiRate * 1.2

        if (num < minRate || num > maxRate) {
          return `Taxa deve estar entre ${minRate.toFixed(2)} e ${maxRate.toFixed(2)} AOA por EUR`
        }
      } else {
        // Fallback range validation
        if (num < 800 || num > 1100) {
          return "Taxa deve estar entre 800 e 1100 AOA por EUR"
        }
      }

      return ""
    }

    const validationError = validateManualRate(exchangeRate)

    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Digite o câmbio"
            onBack={handleBack}
          />

          {/* Manual Rate Input */}
          <div className="mb-3">
            <input
              type="text"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder={getPlaceholderText()}
              className={`w-full h-12 px-3 text-base rounded-2xl border-2 focus:outline-none transition-colors ${
                validationError
                  ? 'border-red-700 focus:border-red-700'
                  : 'border-black focus:border-black'
              }`}
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <p className="form-error-ema mb-3">{validationError}</p>
          )}

          {/* Rate Reference Display */}
          <div className="mb-8">
            <p className="text-right text-sm text-gray-600">
              {getRateReferenceText()}
            </p>
          </div>
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
                ? `1 EUR = ${exchangeRate} AOA`
                : watchedCurrency === "AOA"
                  ? "1 EUR = 924.0675 AOA"
                  : "1 AOA = 0.001082 EUR"
            } />
            <ConfirmationRow label="Tipo de câmbio" value={rateType === "manual" ? "Manual" : "Automática"} highlight />
          </ConfirmationSection>

          {/* Warning */}
          <ConfirmationWarning>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="label-form">1. O Ema Pay atualiza o câmbio automaticamente.</p>
              <p className="label-form">2. Por isso, o valor total que você vai receber pode ser diferente.</p>
              <p className="label-form">3. Seu valor ficará reservado até encontrarmos um comprador. Mas você pode retirar sempre que quiser.</p>
              <p className="label-form">4. Após a venda, o valor será depositado em euros na sua conta. Não fazemos devolução!</p>
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
