"use client"

import { KYCIdFrontCameraStep } from '@/components/features/kyc/kyc-camera-step'

export default function KYCIdFrontPage() {
  return (
    <KYCIdFrontCameraStep
      backPath="/kyc/address"
      nextPath="/kyc/id-back"
    />
  )
}
