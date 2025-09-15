"use client"

import { KYCIncomeSourceSelection } from '@/components/features/kyc/kyc-radio-selection'

export default function KYCIncomeSourcePage() {
  return (
    <KYCIncomeSourceSelection
      backPath="/kyc/occupation"
      nextPath="/kyc/monthly-income"
    />
  )
}
