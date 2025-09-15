"use client"

import { KYCDateFormStep } from '@/components/features/kyc/kyc-form-step'

export default function KYCDateOfBirthPage() {
  return (
    <KYCDateFormStep
      title="Qual sua data de nascimento?"
      fieldKey="dateOfBirth"
      backPath="/kyc/full-name"
      nextPath="/kyc/nationality"
    />
  )
}
