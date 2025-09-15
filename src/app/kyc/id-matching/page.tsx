"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCIdMatchingPage() {
  const router = useRouter()
  const { data, updateData, compareFaces } = useKYC()
  const [isProcessing, setIsProcessing] = useState(true)
  const [matchResult, setMatchResult] = useState<{ success: boolean; similarity?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    router.push("/kyc/liveness-check")
  }

  const handleContinue = () => {
    router.push("/kyc/occupation")
  }

  // Perform face comparison when component mounts
  useEffect(() => {
    const performFaceComparison = async () => {
      try {
        setIsProcessing(true)
        setError(null)

        // Get the uploaded document keys
        const idDocumentKey = data.uploadedDocumentKeys.idUpload
        const selfieKey = data.uploadedDocumentKeys.selfie

        if (!idDocumentKey || !selfieKey) {
          throw new Error('Documentos necessários não encontrados')
        }

        // Compare faces using AWS Rekognition
        await compareFaces(idDocumentKey, selfieKey)

        // Check the comparison results
        const comparisonResult = data.faceComparisonResults
        if (comparisonResult) {
          const success = comparisonResult.isMatch && comparisonResult.similarity >= 85
          setMatchResult({
            success,
            similarity: comparisonResult.similarity
          })
          updateData({ idMatchingPassed: success })
        } else {
          throw new Error('Erro ao processar comparação')
        }
      } catch {
        setError('Erro ao comparar faces. Tente novamente.')
        setMatchResult({ success: false })
      } finally {
        setIsProcessing(false)
      }
    }

    // Add a delay to show processing state
    const timer = setTimeout(performFaceComparison, 2000)
    return () => clearTimeout(timer)
  }, [data.uploadedDocumentKeys, data.faceComparisonResults, compareFaces, updateData])

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Verificando identidade"
          subtitle={isProcessing ? "Comparando sua selfie com a foto do documento..." : "Verificação concluída"}
          onBack={handleBack}
        />

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            {isProcessing && (
              <>
                <div className="w-16 h-16 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black"></div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <p className="text-sm text-gray-600">
                    Aguarde enquanto verificamos sua identidade...
                  </p>
                  <p className="text-sm text-gray-600">
                    Este processo pode levar alguns segundos.
                  </p>
                </div>
              </>
            )}

            {!isProcessing && matchResult?.success && (
              <>
                <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <p className="text-lg font-semibold text-green-600">
                    Identidade verificada!
                  </p>
                  <p className="text-sm text-gray-600">
                    Sua selfie corresponde ao documento enviado.
                  </p>
                  {matchResult.similarity && (
                    <p className="text-xs text-gray-500">
                      Similaridade: {Math.round(matchResult.similarity)}%
                    </p>
                  )}
                </div>
              </>
            )}

            {!isProcessing && matchResult && !matchResult.success && (
              <>
                <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <p className="text-lg font-semibold text-red-600">
                    Verificação falhou
                  </p>
                  <p className="text-sm text-gray-600">
                    Não foi possível verificar sua identidade. Tente novamente.
                  </p>
                  {matchResult.similarity && (
                    <p className="text-xs text-gray-500">
                      Similaridade: {Math.round(matchResult.similarity)}%
                    </p>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {!isProcessing && (
        <FixedBottomAction
          primaryAction={{
            label: matchResult?.success ? "Continuar" : "Tentar Novamente",
            onClick: matchResult?.success ? handleContinue : () => router.push("/kyc/selfie"),
            disabled: false
          }}
        />
      )}
    </div>
  )
}
