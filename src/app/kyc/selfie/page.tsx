"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { CameraCapture } from "@/components/ui/camera-capture"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCSelfiePage() {
  const router = useRouter()
  const { data, updateData, uploadDocument, detectFaceInImage } = useKYC()
  const [mode, setMode] = useState<'instructions' | 'camera'>('instructions')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    if (mode === 'instructions') {
      router.push("/kyc/id-upload")
    } else {
      setMode('instructions')
      setError(null)
    }
  }

  const handleSelfieCapture = async (file: File) => {
    try {
      setIsProcessing(true)
      setError(null)

      // Generate unique user ID for this KYC session
      const userId = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      // Upload selfie to S3
      const s3Key = await uploadDocument(file, 'selfie', userId)

      // Update KYC data with uploaded selfie
      updateData({ selfieImage: s3Key })

      // Detect face in selfie
      await detectFaceInImage(s3Key)

      // Navigate to next step
      router.push("/kyc/liveness-check")
    } catch (error) {
      setError('Erro ao processar selfie. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (mode === 'camera') {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Tire uma selfie"
            subtitle="Posicione seu rosto no centro da tela"
            onBack={handleBack}
          />

          <div className="space-y-6">
            <CameraCapture
              onCapture={handleSelfieCapture}
              onCancel={() => setMode('instructions')}
              facingMode="user"
              captureButtonText="Capturar Selfie"
              retakeButtonText="Tirar Novamente"
              confirmButtonText="Confirmar"
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Tire uma selfie"
          subtitle="Vamos verificar se você é uma pessoa real"
          onBack={handleBack}
        />

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="w-64 h-64 rounded-full border-2 border-black flex items-center justify-center bg-gray-50">
              <Camera className="w-16 h-16 text-black" />
            </div>

            <div className="text-center space-y-2 max-w-sm">
              <p className="text-sm text-gray-600">
                Posicione seu rosto no centro da tela.
              </p>
              <p className="text-sm text-gray-600">
                Certifique-se de que há boa iluminação.
              </p>
              <p className="text-sm text-gray-600">
                Remova óculos escuros ou chapéus.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('camera')}
              className="w-full h-12 rounded-full bg-black text-white font-medium flex items-center justify-center space-x-2"
              disabled={isProcessing}
            >
              <Camera className="w-5 h-5" />
              <span>Tirar Selfie</span>
            </button>
          </div>

          {isProcessing && (
            <div className="text-center p-4">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Processando selfie...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
