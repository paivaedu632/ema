"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { CountrySelector } from "@/components/ui/country-selector"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCNationalityPage() {
  const router = useRouter()
  const { data, updateData } = useKYC()

  const handleBack = () => {
    router.push("/kyc/date-of-birth")
  }

  const handleContinue = () => {
    router.push("/kyc/address")
  }

  const canContinue = data.selectedCountry !== ""

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Qual sua nacionalidade?"
          onBack={handleBack}
        />

        <div className="space-y-6">
          <CountrySelector
            value={data.selectedCountry}
            onValueChange={(value) => updateData({ selectedCountry: value })}
            placeholder="Selecione um país"
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
