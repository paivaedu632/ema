"use client"

import { KYCFormStep } from "@/components/kyc/kyc-form-step"

export default function KYCFullNamePage() {
  return (
    <KYCFormStep
      title="Qual seu nome completo?"
      fieldKey="fullName"
      backPath="/kyc/passcode"
      nextPath="/kyc/date-of-birth"
    />
  )
}
