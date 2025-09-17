"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCIdUploadPage() {
  const router = useRouter()
  const { data, updateData, extractTextFromDocument, validateBI } = useKYC()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentUploaded, setDocumentUploaded] = useState(false)
  const [biValidationComplete, setBiValidationComplete] = useState(false)

  const handleBack = () => {
    router.push("/kyc/id-back")
  }

  // Auto-process documents when component mounts
  useEffect(() => {
    const processDocuments = async () => {
      // Check if we have both front and back images
      if (!data.idFrontImage || !data.idBackImage) {
        setError('Documentos não encontrados. Volte e capture as fotos novamente.')
        return
      }

      try {
        setIsProcessing(true)
        setError(null)

        // For now, we'll process the front image for OCR (assuming it has the main info)
        const frontImageKey = data.idFrontImage

        // Update KYC data with the processed image
        updateData({ idUploadImage: frontImageKey })

        // Extract text using Textract from the front image
        await extractTextFromDocument(frontImageKey)

        // Mark document as uploaded
        setDocumentUploaded(true)

        // Start BI validation automatically if BI number was extracted
        if (data.ocrExtractedBI) {
          await validateBI(data.ocrExtractedBI)
          setBiValidationComplete(true)
        }
      } catch {
        setError('Erro ao processar documentos. Tente novamente.')
      } finally {
        setIsProcessing(false)
      }
    }

    // Only process if we haven't already processed
    if (!documentUploaded && !isProcessing) {
      processDocuments()
    }
  }, [data.idFrontImage, data.idBackImage, data.ocrExtractedBI, documentUploaded, isProcessing, updateData, extractTextFromDocument, validateBI])

  const handleRetryProcessing = () => {
    setDocumentUploaded(false)
    setBiValidationComplete(false)
    setError(null)
  }

  // Effect to handle automatic BI validation when extracted BI changes
  useEffect(() => {
    const performBIValidation = async () => {
      if (data.ocrExtractedBI && documentUploaded && !biValidationComplete) {
        try {
          await validateBI(data.ocrExtractedBI)
          setBiValidationComplete(true)
        } catch {
          setError('Erro ao validar BI. Tente novamente.')
        }
      }
    }

    performBIValidation()
  }, [data.ocrExtractedBI, documentUploaded, biValidationComplete, validateBI])

  const handleContinue = () => {
    router.push("/kyc/selfie")
  }

  const canContinue = documentUploaded && biValidationComplete && data.isValidBI === true

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Processando documento"
          subtitle="Validando as informações do seu BI"
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Processing Status */}
          <div className="text-center space-y-4">
            {isProcessing && (
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-gray-600">Processando documentos...</p>
              </div>
            )}

            {!isProcessing && documentUploaded && biValidationComplete && data.isValidBI === true && (
              <div className="flex flex-col items-center space-y-3">
                <CheckCircle className="w-12 h-12 text-green-600" />
                <p className="text-green-600 font-medium">Documento validado com sucesso!</p>
              </div>
            )}

            {!isProcessing && error && (
              <div className="flex flex-col items-center space-y-3">
                <XCircle className="w-12 h-12 text-red-600" />
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Document Preview */}
          {data.idFrontImage && data.idBackImage && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center">Documentos capturados:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Frente</p>
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Frente do BI</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Verso</p>
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Verso do BI</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {documentUploaded && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Status da validação:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Extração de texto:</span>
                    <span className={data.ocrExtractedBI ? "text-green-600" : "text-gray-500"}>
                      {data.ocrExtractedBI ? "✓ Concluída" : "Pendente"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validação BI:</span>
                    <span className={data.isValidBI === true ? "text-green-600" : data.isValidBI === false ? "text-red-600" : "text-gray-500"}>
                      {data.isValidBI === true ? "✓ Válido" : data.isValidBI === false ? "✗ Inválido" : "Pendente"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: canContinue ? "Continuar" : error ? "Tentar Novamente" : "Aguardar",
          onClick: canContinue ? handleContinue : error ? handleRetryProcessing : () => {},
          disabled: !canContinue && !error
        }}
      />

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isProcessing} />
    </div>
  )
}
