"use client"

import { KYCIdBackCameraStep } from '@/components/features/kyc/kyc-camera-step'

export default function KYCIdBackPage() {
  return (
    <KYCIdBackCameraStep
      backPath="/kyc/id-front"
      nextPath="/kyc/id-upload"
    />
  )
}
