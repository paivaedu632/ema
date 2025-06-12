"use client"

import { useRouter } from "next/navigation"
import { SuccessScreen } from "@/components/ui/success-screen"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCSuccessPage() {
  const router = useRouter()
  const { data, clearData } = useKYC()

  const handleBack = () => {
    router.push("/kyc/app-use")
  }

  const handleContinue = () => {
    // Save all KYC data and redirect to dashboard
    // TODO: Save KYC data to backend
    
    // Clear KYC data after successful completion
    clearData()
    
    router.push("/dashboard")
  }

  return (
    <SuccessScreen
      title="Sua conta aprovada!"
      message="Sua conta foi aprovada com sucesso. Agora você pode usar todos os recursos do EmaPay."
      primaryAction={{
        label: "Continuar",
        onClick: handleContinue
      }}
      onBack={handleBack}
    />
  )
}
