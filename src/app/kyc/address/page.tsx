"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { GooglePlacesInput } from "@/components/ui/google-places-input"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCAddressPage() {
  const router = useRouter()
  const { data, updateData } = useKYC()

  const handleBack = () => {
    router.push("/kyc/nationality")
  }

  const handleContinue = () => {
    router.push("/kyc/id-front")
  }

  const canContinue = data.address.trim() !== ""

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Qual seu endereço?"
          onBack={handleBack}
        />

        <div className="space-y-6">
          <div className="space-y-2">
            <GooglePlacesInput
              value={data.address}
              onChange={(value) => updateData({ address: value })}
              placeholder="Pesquisar endereço"
            />
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
