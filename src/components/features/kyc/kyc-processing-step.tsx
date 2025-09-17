'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { PageHeader } from '@/components/layout/page-header'
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  operation?: () => Promise<void>
}

interface KYCProcessingStepProps {
  title: string
  subtitle?: string
  backPath: string
  nextPath: string
  steps: ProcessingStep[]
  autoStart?: boolean
  onComplete?: () => void
  onError?: (error: string) => void
  className?: string
}

/**
 * Reusable KYC processing step component for AWS operations
 * Handles document upload, text extraction, face detection, and other processing steps
 * Provides consistent loading states, error handling, and progress indication
 */
export function KYCProcessingStep({
  title,
  subtitle,
  backPath,
  nextPath,
  steps,
  autoStart = true,
  onComplete,
  onError,
  className = ""
}: KYCProcessingStepProps) {
  const router = useRouter()
  const [currentSteps, setCurrentSteps] = useState<ProcessingStep[]>(steps)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allCompleted, setAllCompleted] = useState(false)

  const handleBack = () => {
    router.push(backPath)
  }

  const handleContinue = () => {
    router.push(nextPath)
  }

  // Update step status
  const updateStepStatus = (stepId: string, status: ProcessingStep['status']) => {
    setCurrentSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    )
  }

  // Process all steps sequentially
  const processSteps = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      for (const step of currentSteps) {
        if (step.operation) {
          updateStepStatus(step.id, 'processing')
          
          try {
            await step.operation()
            updateStepStatus(step.id, 'completed')
          } catch (stepError) {
            updateStepStatus(step.id, 'failed')
            throw stepError
          }
        } else {
          updateStepStatus(step.id, 'completed')
        }
      }

      setAllCompleted(true)
      onComplete?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro durante o processamento'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [currentSteps, onComplete, onError])

  // Auto-start processing when component mounts
  useEffect(() => {
    if (autoStart) {
      processSteps()
    }
  }, [autoStart, processSteps])

  const canContinue = allCompleted && !isProcessing && !error

  return (
    <div className={`page-container-white ${className}`}>
      <main className="content-container">
        <PageHeader
          title={title}
          subtitle={subtitle || ''}
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Processing Steps */}
          <div className="space-y-4">
            {currentSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {step.status === 'pending' && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                  {step.status === 'processing' && (
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  {step.status === 'failed' && (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'failed' ? 'text-red-700' :
                    step.status === 'processing' ? 'text-blue-700' :
                    'text-gray-700'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {allCompleted && !error && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Processamento concluído com sucesso!</p>
            </div>
          )}

          {/* Retry Button */}
          {error && !isProcessing && (
            <div className="text-center">
              <button
                onClick={processSteps}
                className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Continuar",
          onClick: handleContinue,
          disabled: !canContinue
        }}
      />
    </div>
  )
}

/**
 * Specialized processing step for document upload and validation
 */
export function KYCDocumentProcessingStep({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const { data, extractTextFromDocument, validateBI } = useKYC()

  const processingSteps: ProcessingStep[] = [
    {
      id: 'validate-documents',
      label: 'Validando documentos capturados',
      status: 'pending',
      operation: async () => {
        if (!data.idFrontImage || !data.idBackImage) {
          throw new Error('Documentos não encontrados. Volte e capture as fotos novamente.')
        }
      }
    },
    {
      id: 'extract-text',
      label: 'Extraindo informações do documento',
      status: 'pending',
      operation: async () => {
        if (data.idFrontImage) {
          await extractTextFromDocument(data.idFrontImage)
        }
      }
    },
    {
      id: 'validate-bi',
      label: 'Validando número do BI',
      status: 'pending',
      operation: async () => {
        if (data.ocrExtractedBI) {
          await validateBI(data.ocrExtractedBI)
        }
      }
    }
  ]

  return (
    <KYCProcessingStep
      title="Processando documentos"
      subtitle="Aguarde enquanto validamos suas informações"
      backPath={backPath}
      nextPath={nextPath}
      steps={processingSteps}
      autoStart={true}
      className={className}
    />
  )
}

/**
 * Specialized processing step for face matching
 */
export function KYCFaceMatchingStep({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const { data, compareFaces } = useKYC()

  const processingSteps: ProcessingStep[] = [
    {
      id: 'validate-images',
      label: 'Validando imagens capturadas',
      status: 'pending',
      operation: async () => {
        if (!data.selfieImage || !data.idFrontImage) {
          throw new Error('Imagens necessárias não encontradas.')
        }
      }
    },
    {
      id: 'compare-faces',
      label: 'Comparando rosto com documento',
      status: 'pending',
      operation: async () => {
        if (data.selfieImage && data.idFrontImage) {
          await compareFaces(data.selfieImage, data.idFrontImage)
        }
      }
    }
  ]

  return (
    <KYCProcessingStep
      title="Verificando identidade"
      subtitle="Comparando sua selfie com o documento"
      backPath={backPath}
      nextPath={nextPath}
      steps={processingSteps}
      autoStart={true}
      className={className}
    />
  )
}
