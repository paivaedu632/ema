"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Landmark, Clock, Zap } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { DetailRow } from "@/components/ui/detail-row"
import { InfoSection } from "@/components/ui/info-section"

type Step = "amount" | "payment" | "success"
type PaymentMethod = "bank_transfer" | "test_deposit"

export function DepositFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("test_deposit")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const paymentDetails = {
    payeeName: "EMA AGOSTINHO",
    phoneNumber: "244923300064",
    iban: "12345",
    amount: `${amount} ${currency}`,
    reference: "[Your phone]"
  }

  const handleContinue = async () => {
    if (paymentMethod === "test_deposit") {
      await handleTestDeposit()
    } else {
      setCurrentStep("payment")
    }
  }

  const handleTestDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Por favor, insira um valor válido")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const response = await fetch('/api/test-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: currency
        })
      })

      const result = await response.json()

      if (result.success) {
        setCurrentStep("success")
      } else {
        setError(result.error || "Erro ao processar depósito")
      }
    } catch (error) {
      console.error('Deposit error:', error)
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setIsProcessing(false)
    }
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

  const togglePaymentMethod = () => {
    setPaymentMethod(paymentMethod === "test_deposit" ? "bank_transfer" : "test_deposit")
    setError("")
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
              icon={paymentMethod === "test_deposit" ? Zap : Landmark}
              label="Forma de pagamento"
              value={paymentMethod === "test_deposit" ? "Depósito instantâneo (teste)" : "Transferência bancária"}
              actionButton={{
                label: "Trocar",
                onClick: togglePaymentMethod
              }}
            />

            {/* Arrival Time Section */}
            <InfoSection
              icon={Clock}
              label="Vai chegar"
              value={paymentMethod === "test_deposit" ? "Instantâneo" : "Hoje"}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </main>

        <FixedBottomAction
          primaryAction={{
            label: isProcessing ? "Processando..." : "Continuar",
            onClick: handleContinue,
            disabled: isProcessing || !amount || parseFloat(amount) <= 0
          }}
        />
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Obrigado!"
        message={paymentMethod === "test_deposit"
          ? "Seu depósito foi processado instantaneamente!"
          : "Seu dinheiro chegará em 1-2 dias úteis na sua conta EmaPay."
        }
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
