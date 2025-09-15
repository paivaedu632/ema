'use client'

import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

interface KYCCameraStepProps {
  title: string
  subtitle?: string
  fieldKey: keyof ReturnType<typeof useKYC>['data']
  backPath: string
  nextPath: string
  instructions: string[]
  buttonLabel?: string
  simulatedValue: string
  className?: string
}

/**
 * Reusable KYC camera step component for document capture steps
 * Eliminates duplicate code across id-front, id-back, and other camera capture steps
 * Follows EmaPay KYC design patterns with camera icon, instructions, and consistent layout
 */
export function KYCCameraStep({
  title,
  subtitle,
  fieldKey,
  backPath,
  nextPath,
  instructions,
  buttonLabel = "Tirar foto",
  simulatedValue,
  className = ""
}: KYCCameraStepProps) {
  const router = useRouter()
  const { updateData } = useKYC()

  const handleBack = () => {
    router.push(backPath)
  }

  const handleTakePhoto = () => {
    // Simulate taking a photo (in real implementation, this would open camera)
    updateData({ [fieldKey]: simulatedValue } as Record<string, unknown>)
    router.push(nextPath)
  }

  return (
    <div className={`page-container-white ${className}`}>
      <main className="content-container">
        <PageHeader
          title={title}
          subtitle={subtitle}
          onBack={handleBack}
        />

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            {/* Camera Preview Area */}
            <div className="w-80 h-52 rounded-lg border-2 border-black flex items-center justify-center bg-gray-50">
              <Camera className="w-16 h-16 text-black" />
            </div>

            {/* Instructions */}
            <div className="text-center space-y-2 max-w-sm">
              {instructions.map((instruction, index) => (
                <p key={index} className="text-sm text-gray-600">
                  {instruction}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: buttonLabel,
          onClick: handleTakePhoto,
          disabled: false
        }}
      />
    </div>
  )
}

/**
 * Specialized camera step for ID front capture
 */
export function KYCIdFrontCameraStep({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const instructions = [
    "Tire seu documento do plástico para evitar reflexos.",
    "Posicione o documento dentro da área marcada.",
    "Certifique-se de que todas as informações estão legíveis."
  ]

  return (
    <KYCCameraStep
      title="Tire uma foto da frente do seu BI"
      subtitle="Capture uma imagem clara da frente do documento para verificação manual."
      fieldKey="idFrontImage"
      backPath={backPath}
      nextPath={nextPath}
      instructions={instructions}
      buttonLabel="Tirar foto"
      simulatedValue="id-front-captured"
      className={className}
    />
  )
}

/**
 * Specialized camera step for ID back capture
 */
export function KYCIdBackCameraStep({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const instructions = [
    "Tire seu documento do plástico para evitar reflexos.",
    "Posicione o documento dentro da área marcada.",
    "Certifique-se de que todas as informações estão legíveis."
  ]

  return (
    <KYCCameraStep
      title="Tire uma foto do verso do seu BI"
      subtitle="Capture uma imagem clara do verso do documento para verificação manual."
      fieldKey="idBackImage"
      backPath={backPath}
      nextPath={nextPath}
      instructions={instructions}
      buttonLabel="Tirar foto"
      simulatedValue="id-back-captured"
      className={className}
    />
  )
}

/**
 * Specialized camera step for passport capture
 */
export function KYCPassportCameraStep({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const instructions = [
    "Posicione o passaporte dentro da área marcada.",
    "Certifique-se de que a página com foto está visível.",
    "Verifique se todas as informações estão legíveis."
  ]

  return (
    <KYCCameraStep
      title="Tire uma foto do seu passaporte"
      subtitle="Capture uma imagem clara da página principal do passaporte."
      fieldKey="idFrontImage"
      backPath={backPath}
      nextPath={nextPath}
      instructions={instructions}
      buttonLabel="Tirar foto"
      simulatedValue="passport-captured"
      className={className}
    />
  )
}
