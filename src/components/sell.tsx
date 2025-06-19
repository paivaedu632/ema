"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, Wrench, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { OptionSelector } from "@/components/ui/option-selector"
import { checkTransactionLimitsClient } from "@/lib/supabase"

type Step = "amount" | "rateType" | "manualRate" | "confirmation" | "success"



export function SellFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [sellCurrency, setSellCurrency] = useState("AOA")
  const [exchangeRate, setExchangeRate] = useState("924.0675")
  const [rateType, setRateType] = useState<"automatic" | "manual">("automatic")
  const [availableBalance] = useState("100 EUR")
  const [limitCheck, setLimitCheck] = useState<any>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [checkingLimits, setCheckingLimits] = useState(false)

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
    setCurrentStep("rateType")
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
    try {
      const response = await fetch('/api/transactions/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          exchangeRate: 0.001082 // Static AOA->EUR rate
        })
      })

      const result = await response.json()

      if (result.success) {
        // Transaction successful, go to success screen
        setCurrentStep("success")
      } else {
        // Handle transaction error
        console.error('Sell transaction failed:', result.error)
        alert(`Erro na transação: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing sell transaction:', error)
      alert('Erro ao processar transação. Tente novamente.')
    }
  }

  const handleShare = () => {
    // TODO: Handle share functionality
  }

  const handleBackToHome = () => {
    // Navigate back to dashboard
    router.push("/")
  }

  // Check transaction limits when amount changes
  useEffect(() => {
    const checkLimits = async () => {
      if (!amount || amount === "0" || isNaN(Number(amount))) {
        setLimitCheck(null)
        setLimitError(null)
        return
      }

      setCheckingLimits(true)
      setLimitError(null)

      try {
        const { data, error } = await checkTransactionLimitsClient(
          Number(amount),
          sellCurrency,
          'sell'
        )

        if (error) {
          setLimitError('Erro ao verificar limites. Tente novamente.')
          setLimitCheck(null)
        } else {
          setLimitCheck(data)
          if (data && !data.within_limits) {
            if (data.requires_kyc) {
              setLimitError('Verificação KYC necessária para esta transação.')
            } else {
              setLimitError(`Limite ${data.limit_type} excedido. Limite atual: ${data.current_limit} ${sellCurrency}`)
            }
          }
        }
      } catch (error) {
        setLimitError('Erro ao verificar limites. Tente novamente.')
        setLimitCheck(null)
      } finally {
        setCheckingLimits(false)
      }
    }

    // Debounce the limit check
    const timeoutId = setTimeout(checkLimits, 500)
    return () => clearTimeout(timeoutId)
  }, [amount, sellCurrency])

  const baseCanContinue = amount && !isNaN(Number(amount)) && Number(amount) > 0
  const canContinue = baseCanContinue && !limitError && !checkingLimits && (limitCheck?.within_limits !== false)

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer vender?"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={amount}
            currency={sellCurrency}
            onAmountChange={setAmount}
            onCurrencyChange={setSellCurrency}
          />

          <AvailableBalance amount={availableBalance} />

          {/* Limit Check Status */}
          {amount && amount !== "0" && amount !== "" && (
            <div className="mb-8 space-y-4">
              {checkingLimits && (
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600">Verificando limites...</span>
                </div>
              )}

              {limitError && (
                <div className="bg-red-50 rounded-2xl p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">Limite excedido</p>
                    <p className="text-sm text-red-600 mt-1">{limitError}</p>
                    {limitCheck?.requires_kyc && (
                      <button
                        onClick={() => window.location.href = '/kyc/notifications'}
                        className="text-sm text-red-700 underline mt-2 hover:text-red-800"
                      >
                        Iniciar verificação KYC →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue,
            disabled: !canContinue
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
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Digite o câmbio?"
            onBack={handleBack}
          />

          <AmountInput
            amount={exchangeRate}
            currency={sellCurrency}
            onAmountChange={setExchangeRate}
            onCurrencyChange={setSellCurrency}
            className="mb-6"
          />

          <div className="mb-8">
            <p className="text-center text-sm text-gray-600">
              1 EUR = {exchangeRate} AOA
            </p>
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleManualRateContinue,
            disabled: !exchangeRate || isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0
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
            <ConfirmationRow label="Seu saldo" value="100 AOA" />
            <ConfirmationRow label="Você vende" value={`${amount} ${sellCurrency}`} />
            <ConfirmationRow label="Câmbio" value="1.00 USD = 924.0675 AOA" />
            <ConfirmationRow label="Você recebe" value={`${amount} AOA`} highlight />
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
