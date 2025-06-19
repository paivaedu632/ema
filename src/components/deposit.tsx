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

interface PaymentInstructions {
  payee_name: string
  phone_number: string
  iban: string
  reference: string
  amount: number
  currency: string
  transaction_id: string
}

interface DepositResult {
  transaction: {
    id: string
    reference_id: string
    amount: number
    currency: string
    status: string
    created_at: string
  }
  wallet: {
    currency: string
    available_balance: number
    updated_at: string
  }
}

export function DepositFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [validationError, setValidationError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null)
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null)
  const [error, setError] = useState<string>("")

  const handleContinue = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/transactions/deposit/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: currency,
          payment_method: 'bank_transfer'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payment instructions')
      }

      if (data.success) {
        setPaymentInstructions(data.data)
        setCurrentStep("payment")
      } else {
        throw new Error(data.error || 'Failed to generate payment instructions')
      }
    } catch (error) {
      console.error('Error generating payment instructions:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate payment instructions')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentComplete = async () => {
    if (!paymentInstructions) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/transactions/deposit/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: paymentInstructions.transaction_id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete deposit')
      }

      if (data.success) {
        setDepositResult(data.data)
        setCurrentStep("success")
      } else {
        throw new Error(data.error || 'Failed to complete deposit')
      }
    } catch (error) {
      console.error('Error completing deposit:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete deposit')
    } finally {
      setIsLoading(false)
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
            transactionType="deposit"
            showValidation={true}
            onValidationChange={(isValid, errorMessage) => {
              setValidationError(errorMessage || "")
            }}
            className="mb-8"
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8 space-y-4">
            {/* Payment Method Section */}
            <InfoSection
              icon={Landmark}
              label="Forma de pagamento"
              value="Transferência bancária"
              actionButton={{
                label: "Trocar",
                onClick: () => {/* TODO: Change payment method */}
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
            onClick: handleContinue,
            disabled: !amount || parseFloat(amount) <= 0 || !!validationError || isLoading
          }}
        />
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Depósito concluído!"
        message={`Seu depósito de ${depositResult?.transaction.amount} ${depositResult?.transaction.currency} foi processado com sucesso. O valor já está disponível na sua conta.`}
        primaryAction={{
          label: "Voltar ao início",
          onClick: handleBackToHome
        }}
      />
    )
  }

  if (currentStep === "payment") {
    if (!paymentInstructions) {
      return (
        <div className="page-container-white">
          <main className="content-container">
            <PageHeader
              title="Carregando..."
              onBack={handleBack}
            />
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          </main>
        </div>
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
            <DetailRow
              label="Nome"
              value={paymentInstructions.payee_name}
              fieldName="payeeName"
            />
            <DetailRow
              label="Celular"
              value={paymentInstructions.phone_number}
              fieldName="phoneNumber"
            />
            <DetailRow
              label="IBAN"
              value={paymentInstructions.iban}
              fieldName="iban"
            />
            <DetailRow
              label="Valor"
              value={`${paymentInstructions.amount} ${paymentInstructions.currency}`}
              fieldName="amount"
            />
            <DetailRow
              label="Referência"
              value={paymentInstructions.reference}
              fieldName="reference"
            />
          </div>

          <div className="card-warning mb-6">
            <h3 className="heading-small mb-2">Atenção:</h3>
            <p className="label-form mb-2">
              A transferência deve estar com o número de referência {paymentInstructions.reference} ou será devolvida.
            </p>
            <p className="label-form text-xs text-gray-600">
              Após fazer a transferência, clique em "Paguei" para confirmar.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Paguei",
            onClick: handlePaymentComplete,
            disabled: isLoading
          }}
        />
      </div>
    )
  }
}
