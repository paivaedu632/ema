"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCPepPage() {
  const router = useRouter()
  const { data, updateData } = useKYC()

  const handleBack = () => {
    router.push("/kyc/monthly-income")
  }

  const handleContinue = () => {
    router.push("/kyc/app-use")
  }

  const canContinue = data.isPEP !== null

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Você é uma pessoa politicamente exposta?"
          subtitle="Pessoa politicamente exposta (PEP) é alguém que exerce ou exerceu função pública relevante."
          onBack={handleBack}
        />

        <div className="space-y-6">
          <div className="space-y-4">
            <button
              onClick={() => updateData({ isPEP: true })}
              className={`w-full h-12 rounded-full border-2 transition-colors ${
                data.isPEP === true
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black hover:bg-gray-50"
              }`}
            >
              Sim
            </button>
            
            <button
              onClick={() => updateData({ isPEP: false })}
              className={`w-full h-12 rounded-full border-2 transition-colors ${
                data.isPEP === false
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black hover:bg-gray-50"
              }`}
            >
              Não
            </button>
          </div>
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
