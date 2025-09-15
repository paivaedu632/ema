"use client"

import { KYCAppUseSelection } from "@/components/kyc/kyc-radio-selection"

export default function KYCAppUsePage() {
  return (
    <KYCAppUseSelection
      backPath="/kyc/pep"
      nextPath="/kyc/success"
    />
  )
}
