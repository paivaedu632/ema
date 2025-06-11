"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Landmark, Clock } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { DetailRow } from "@/components/ui/detail-row"
import { InfoSection } from "@/components/ui/info-section"

type Step = "amount" | "payment" | "success"

export function DepositFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const paymentDetails = {
    payeeName: "EMA AGOSTINHO",
    phoneNumber: "244923300064",
    iban: "12345",
    amount: `${amount} AOA`,
    reference: "[Your phone]"
  }

  const handleContinue = () => {
    setCurrentStep("payment")
  }

  const handleBack = () => {
    if (currentStep === "payment") {
      setCurrentStep("amount")
    } else if (currentStep === "success") {
      router.push("/")
    }
  }

  const handleBackToDashboard = () => {
    router.push("/")
  }

  const handlePaymentComplete = () => {
    setCurrentStep("success")
  }

  const handleBackToHome = () => {
    router.push("/")
  }



  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer depositar?"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={amount}
            currency={currency}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
            className="mb-8"
          />

          <div className="mb-8 space-y-4">
            {/* Payment Method Section */}
            <InfoSection
              icon={Landmark}
              label="Forma de pagamento"
              value="Transferência bancária"
              actionButton={{
                label: "Trocar",
                onClick: () => console.log("Change payment method")
              }}
            />

            {/* Arrival Time Section */}
            <InfoSection
              icon={Clock}
              label="Vai chegar"
              value="Hoje"
            />
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue
          }}
        />
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Obrigado!"
        message="Seu dinheiro chegará em 1-2 dias úteis na sua conta EmaPay."
        primaryAction={{
          label: "Voltar ao início",
          onClick: handleBackToHome
        }}
      />
    )
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Como depositar?"
          subtitle="Entre no seu banco e faça uma transferência expressa para a conta abaixo:"
          onBack={handleBack}
        />

        <div className="card-content mb-6">
          <DetailRow label="Nome" value={paymentDetails.payeeName} fieldName="payeeName" />
          <DetailRow label="Celular" value={paymentDetails.phoneNumber} fieldName="phoneNumber" />
          <DetailRow label="IBAN" value={paymentDetails.iban} fieldName="iban" />
          <DetailRow label="Valor" value={paymentDetails.amount} fieldName="amount" />
          <DetailRow label="Referência" value={paymentDetails.reference} fieldName="reference" />
        </div>

        <div className="card-warning mb-6">
          <h3 className="heading-small mb-2">Atenção:</h3>
          <p className="label-form mb-2">
            A transferência deve estar com o número de referência do seu celular ou será devolvida.
          </p>        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Paguei",
          onClick: handlePaymentComplete
        }}
      />
    </div>
  )
}
