"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { AuthFormField } from "@/components/ui/form-field"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"

type Step = "amount" | "account" | "confirm" | "success"

export function WithdrawFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [availableBalance] = useState("100 EUR")
  const [ibanOrPhone, setIbanOrPhone] = useState("")

  const handleBackToDashboard = () => {
    router.push("/")
  }

  const handleBack = () => {
    if (currentStep === "confirm") {
      setCurrentStep("account")
    } else if (currentStep === "account") {
      setCurrentStep("amount")
    } else if (currentStep === "success") {
      router.push("/")
    } else {
      router.push("/")
    }
  }

  const handleContinue = () => {
    if (currentStep === "amount") {
      setCurrentStep("account")
    } else if (currentStep === "account") {
      setCurrentStep("confirm")
    } else if (currentStep === "confirm") {
      // Handle withdrawal submission and show success
      console.log("Complete withdrawal:", { amount, currency, ibanOrPhone })
      setCurrentStep("success")
    }
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const canContinue = currentStep === "amount"
    ? amount && !isNaN(Number(amount)) && Number(amount) > 0
    : currentStep === "account"
    ? ibanOrPhone.trim() !== ""
    : true // confirm step

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer retirar:"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={amount}
            currency={currency}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
          />

          <AvailableBalance amount={availableBalance} />
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

  if (currentStep === "account") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Qual seu IBAN ou Celular?"
            onBack={handleBack}
          />

          <div className="space-y-6">
            <AuthFormField
              type="text"
              value={ibanOrPhone}
              onChange={setIbanOrPhone}
            />
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

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Saque solicitado!"
        message="Seu saque foi processado com sucesso. O valor será transferido em breve."
        primaryAction={{
          label: "Voltar ao início",
          onClick: handleBackToHome
        }}
        className="bg-gray-50"
      />
    )
  }

  // Step 3: Confirmation
  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Confirme saque"
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Recipient Details */}
          <ConfirmationSection title="Enviar para">
            <ConfirmationRow label="Nome" value="Ema Agostinho" />
            <ConfirmationRow label="Banco" value="BAI" />
            <ConfirmationRow label="Conta/IBAN" value={ibanOrPhone || "244923300064"} />
          </ConfirmationSection>

          {/* Transfer Details */}
          <ConfirmationSection title="Transferência">
            <ConfirmationRow label="Seu saldo" value="100 AOA" />
            <ConfirmationRow label="Você envia" value={`${amount} AOA`} />
            <ConfirmationRow label="Taxa" value="100 AOA" />
            <ConfirmationRow label="Você recebe" value={`${amount} AOA`} highlight />
            <ConfirmationRow label="Tempo" value="Segundos" />
          </ConfirmationSection>

          {/* Reference */}
          <div className="form-input-with-subtitle">
            <h2 className="text-lg font-semibold text-gray-900">Referência</h2>

            <Input
              type="text"
              className="form-input-standard"
              placeholder=""
            />

            <span className="text-sm text-gray-600">(Opcional)</span>
          </div>

          {/* Warning */}
          <ConfirmationWarning>Devido alta demanda, seu saque pode demorar 24h para ser realizado.
          </ConfirmationWarning>
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
