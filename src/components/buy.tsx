"use client"

import { useState } from "react"
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

export function BuyFlow() {
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [availableBalance] = useState("100 EUR")

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

  // Use reusable validation hook
  const canContinue = useCanContinue(amount)

  // Use reusable fee calculation utilities
  const feeAmount = calculateFeeAmount(amount, currency)
  const transactionSummary = getTransactionSummary(amount, currency)

  const handleContinue = () => {
    if (currentStep === "amount") {
      setStep("confirmation")
    } else if (currentStep === "confirmation") {
      // Process the transaction and go to success
      console.log("Confirming buy:", { amount, currency })
      setStep("success")
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
