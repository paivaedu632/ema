"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Check, X, RotateCcw } from "lucide-react"

interface LivenessCheckProps {
  onComplete: (result: { passed: boolean; confidence: number; imageFile?: File }) => void
  onCancel?: () => void
  className?: string
}

interface LivenessInstruction {
  id: string
  text: string
  icon: string
  duration: number
}

const LIVENESS_INSTRUCTIONS: LivenessInstruction[] = [
  { id: 'center', text: 'Mantenha o rosto centralizado', icon: '👤', duration: 3000 },
  { id: 'blink', text: 'Pisque os olhos naturalmente', icon: '👁️', duration: 2000 },
  { id: 'smile', text: 'Sorria levemente', icon: '😊', duration: 2000 },
  { id: 'turn-left', text: 'Vire ligeiramente para a esquerda', icon: '⬅️', duration: 2000 },
  { id: 'turn-right', text: 'Vire ligeiramente para a direita', icon: '➡️', duration: 2000 },
  { id: 'center-final', text: 'Volte ao centro e mantenha', icon: '✅', duration: 2000 }
]

export function LivenessCheck({ onComplete, onCancel, className = '' }: LivenessCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsStreaming(true)
      }
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }, [])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // Start liveness check process
  const startLivenessCheck = useCallback(() => {
    if (!isStreaming) return
    
    setCurrentStep(0)
    setCountdown(3)
    
    // Countdown before starting
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval)
          setCountdown(null)
          // Start the actual liveness check
          processLivenessSteps()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [isStreaming, processLivenessSteps])

  // Process liveness check steps
  const processLivenessSteps = useCallback(() => {
    let stepIndex = 0
    
    const processStep = () => {
      if (stepIndex >= LIVENESS_INSTRUCTIONS.length) {
        // Complete the liveness check
        completeLivenessCheck()
        return
      }
      
      setCurrentStep(stepIndex)
      
      setTimeout(() => {
        stepIndex++
        processStep()
      }, LIVENESS_INSTRUCTIONS[stepIndex].duration)
    }
    
    processStep()
  }, [completeLivenessCheck])

  // Complete liveness check and capture final image
  const completeLivenessCheck = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsProcessing(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return
      
      // Set canvas dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Capture final frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `liveness-check-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          })
          
          // Simulate liveness verification (in real app, this would call AWS API)
          setTimeout(() => {
            setIsComplete(true)
            setIsProcessing(false)
            stopCamera()
            
            // Return successful result
            onComplete({
              passed: true,
              confidence: 95,
              imageFile: file
            })
          }, 2000)
        }
      }, 'image/jpeg', 0.8)
    } catch {
      setError('Erro ao processar verificação. Tente novamente.')
      setIsProcessing(false)
    }
  }, [onComplete, stopCamera])

  // Restart liveness check
  const restartCheck = useCallback(() => {
    setCurrentStep(0)
    setIsProcessing(false)
    setIsComplete(false)
    setError(null)
    startLivenessCheck()
  }, [startLivenessCheck])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  const currentInstruction = LIVENESS_INSTRUCTIONS[currentStep]

  return (
    <div className={`liveness-check ${className}`}>
      <div className="w-full max-w-md mx-auto">
        {/* Camera Preview */}
        <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden mb-6">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-white text-center p-4">
                <X className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm">{error}</p>
                <button
                  onClick={startCamera}
                  className="mt-3 px-4 py-2 bg-white text-black rounded-full text-sm font-medium"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ display: isStreaming && !error ? 'block' : 'none' }}
          />
          
          {/* Face outline overlay */}
          {isStreaming && !error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-48 h-60 border-2 border-white/50 rounded-full" />
              </div>
            </div>
          )}
          
          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="text-6xl font-bold mb-2">{countdown}</div>
                <p className="text-lg">Preparando verificação...</p>
              </div>
            </div>
          )}
          
          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg">Processando verificação...</p>
              </div>
            </div>
          )}
          
          {/* Success overlay */}
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90">
              <div className="text-white text-center">
                <Check className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl font-semibold">Verificação Concluída!</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Instructions */}
        {isStreaming && !error && !isComplete && countdown === null && (
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{currentInstruction?.icon}</div>
            <p className="text-lg font-medium">{currentInstruction?.text}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / LIVENESS_INSTRUCTIONS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-3">
          {isStreaming && !error && countdown === null && !isProcessing && !isComplete && currentStep === 0 && (
            <button
              onClick={startLivenessCheck}
              className="w-full h-12 rounded-full bg-black text-white font-medium"
            >
              Iniciar Verificação
            </button>
          )}
          
          {error && (
            <button
              onClick={restartCheck}
              className="w-full h-12 rounded-full bg-black text-white font-medium flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Tentar Novamente</span>
            </button>
          )}
          
          {onCancel && !isProcessing && (
            <button
              onClick={onCancel}
              className="w-full h-12 rounded-full bg-gray-100 text-gray-600 font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
