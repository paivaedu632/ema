"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { CodeInput } from "@/components/ui/code-input"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCPasscodePage() {
  const router = useRouter()
  const { data, updateData } = useKYC()
  const [currentStep, setCurrentStep] = useState<"create" | "confirm">("create")
  const [error, setError] = useState("")

  const handleBack = () => {
    if (currentStep === "confirm") {
      setCurrentStep("create")
      setError("")
    } else {
      router.push("/kyc/notifications")
    }
  }

  const handleContinue = () => {
    if (currentStep === "create") {
      setCurrentStep("confirm")
      setError("")
    } else {
      // Confirm step - check if passcodes match
      if (data.passcode === data.passcodeConfirmation) {
        router.push("/kyc/full-name")
      } else {
        setError("Os códigos não coincidem. Tente novamente.")
        // Reset confirmation and go back to create step
        updateData({ passcodeConfirmation: "" })
        setCurrentStep("create")
      }
    }
  }

  const canContinue = currentStep === "create"
    ? data.passcode.length === 6
    : data.passcodeConfirmation.length === 6

  const title = currentStep === "create"
    ? "Crie seu código de segurança"
    : "Confirme seu código de segurança"

  const value = currentStep === "create"
    ? data.passcode
    : data.passcodeConfirmation

  const onChange = currentStep === "create"
    ? (value: string) => updateData({ passcode: value })
    : (value: string) => updateData({ passcodeConfirmation: value })

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title={title}
          onBack={handleBack}
        />

        <div className="space-y-6">
          {error && (
            <div className="text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <CodeInput
            length={6}
            value={value}
            onChange={onChange}
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
