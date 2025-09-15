"use client"

import { KYCIdBackCameraStep } from "@/components/kyc/kyc-camera-step"

export default function KYCIdBackPage() {
  return (
    <KYCIdBackCameraStep
      backPath="/kyc/id-front"
      nextPath="/kyc/id-upload"
    />
  )
}
