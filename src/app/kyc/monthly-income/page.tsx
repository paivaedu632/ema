"use client"

import { KYCMonthlyIncomeSelection } from "@/components/kyc/kyc-radio-selection"

export default function KYCMonthlyIncomePage() {
  return (
    <KYCMonthlyIncomeSelection
      backPath="/kyc/income-source"
      nextPath="/kyc/pep"
    />
  )
}
