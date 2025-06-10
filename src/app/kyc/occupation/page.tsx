"use client"

import { KYCFormStep } from "@/components/kyc/kyc-form-step"

export default function KYCOccupationPage() {
  return (
    <KYCFormStep
      title="Qual sua ocupação?"
      fieldKey="occupation"
      backPath="/kyc/id-matching"
      nextPath="/kyc/income-source"
    />
  )
}
