"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LivenessCheck } from "@/components/ui/liveness-check"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCLivenessCheckPage() {
  const router = useRouter()
  const { data, updateData, uploadDocument, performLivenessCheck } = useKYC()
  const [mode, setMode] = useState<'instructions' | 'verification'>('instructions')
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    if (mode === 'instructions') {
      router.push("/kyc/selfie")
    } else {
      setMode('instructions')
      setError(null)
    }
  }

  const handleLivenessComplete = async (result: { passed: boolean; confidence: number; imageFile?: File }) => {
    try {
      if (!result.passed) {
        setError('Verificação de vida falhou. Tente novamente.')
        setMode('instructions')
        return
      }

      if (result.imageFile) {
        // Generate unique user ID for this KYC session
        const userId = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

        // Upload liveness check image to S3
        const s3Key = await uploadDocument(result.imageFile, 'selfie', userId)

        // Perform liveness check via API
        await performLivenessCheck(s3Key)
      }

      // Update KYC data and navigate to next step
      updateData({ livenessCheckPassed: result.passed })
      router.push("/kyc/id-matching")
    } catch (error) {
      console.error('Error processing liveness check:', error)
      setError('Erro ao processar verificação. Tente novamente.')
      setMode('instructions')
    }
  }

  if (mode === 'verification') {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Verificação de vida"
            subtitle="Siga as instruções na tela"
            onBack={handleBack}
          />

          <div className="space-y-6">
            <LivenessCheck
              onComplete={handleLivenessComplete}
              onCancel={() => setMode('instructions')}
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
          title="Verificação de vida"
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
                Siga as instruções na tela para completar a verificação de vida.
              </p>
              <p className="text-sm text-gray-600">
                Mantenha o rosto centralizado e siga os movimentos solicitados.
              </p>
              <p className="text-sm text-gray-600">
                O processo levará cerca de 15 segundos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('verification')}
              className="w-full h-12 rounded-full bg-black text-white font-medium flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Iniciar Verificação</span>
            </button>
          </div>

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
