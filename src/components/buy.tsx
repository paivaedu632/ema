"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Clock, Wallet } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow } from "@/components/ui/confirmation-section"
import { InfoSection } from "@/components/ui/info-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { TransactionSummary } from "@/components/ui/transaction-summary"
import { useTransactionFlow } from "@/hooks/use-multi-step-flow"
import { useCanContinue } from "@/hooks/use-amount-validation"
import { calculateFeeAmount, getTransactionSummary } from "@/utils/fee-calculations"
import { checkTransactionLimitsClient } from "@/lib/supabase"


export function BuyFlow() {
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [availableBalance] = useState("100 EUR")
  const [limitCheck, setLimitCheck] = useState<any>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [checkingLimits, setCheckingLimits] = useState(false)
  const [validationError, setValidationError] = useState<string>("")

  // Static exchange rates as per user preference
  const exchangeRate = "1.00 EUR = 924.0675 AOA"

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

  // Use reusable validation hook with limit checking
  const baseCanContinue = useCanContinue(amount)
  const canContinue = baseCanContinue && !limitError && !checkingLimits && (limitCheck?.within_limits !== false) && !validationError

  // Use reusable fee calculation utilities
  const feeAmount = calculateFeeAmount(amount, currency)
  const transactionSummary = getTransactionSummary(amount, currency)

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
          'EUR', // Buy operations use EUR as base currency
          'buy'
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
              setLimitError(`Limite ${data.limit_type} excedido. Limite atual: ${data.current_limit} EUR`)
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
  }, [amount])



  const handleContinue = () => {
    if (currentStep === "amount") {
      setStep("confirmation")
    } else if (currentStep === "confirmation") {
      processBuyTransaction()
    }
  }

  const processBuyTransaction = async () => {
    try {
      const response = await fetch('/api/transactions/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          exchangeRate: 924.0675 // Static rate as per user preference
        })
      })

      const result = await response.json()

      if (result.success) {
        // Transaction successful, go to success screen
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

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer comprar:"
            onBack={handleBack}
          />

          <AmountInput
            amount={amount}
            currency={currency}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
            transactionType="buy"
            showValidation={true}
            onValidationChange={(isValid, errorMessage) => {
              setValidationError(errorMessage || "")
            }}
            className="mb-6"
          />

          <AvailableBalance
            amount={availableBalance}
          />

          <div>
            {amount && amount !== "0" && amount !== "" && (
              <div className="mb-8 space-y-4">
                {/* Exchange Rate Section */}
                <InfoSection
                  icon={RefreshCw}
                  label="Câmbio"
                  value={exchangeRate}
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
            disabled: !canContinue
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
              <ConfirmationRow label="Seu saldo" value="100 EUR" />
              <ConfirmationRow label="Compra" value="100 EUR" />
              <ConfirmationRow label="Taxa" value={feeAmount} />
              <ConfirmationRow label="Você recebe" value={transactionSummary.total} highlight />
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
  return (
    <SuccessScreen
      title="Compra confirmada!"
      message={`Você recebeu ${amount} ${currency} na sua carteira.`}
      primaryAction={{
        label: "Voltar ao início",
        onClick: handleBackToHome
      }}
    />
  )
}
