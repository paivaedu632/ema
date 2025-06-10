"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, X } from "lucide-react"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel?: () => void
  facingMode?: 'user' | 'environment'
  className?: string
  captureButtonText?: string
  retakeButtonText?: string
  confirmButtonText?: string
}

export function CameraCapture({
  onCapture,
  onCancel,
  facingMode = 'user',
  className = '',
  captureButtonText = "Tirar Foto",
  retakeButtonText = "Tirar Novamente",
  confirmButtonText = "Confirmar"
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const constraints = {
        video: {
          facingMode,
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
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    } finally {
      setIsLoading(false)
    }
  }, [facingMode])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)
    
    // Stop camera stream
    stopCamera()
  }, [stopCamera])

  // Confirm captured image
  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return
    
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        })
        onCapture(file)
      }
    }, 'image/jpeg', 0.8)
  }, [capturedImage, onCapture])

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  return (
    <div className={`camera-capture ${className}`}>
      <div className="relative w-full max-w-md mx-auto">
        {/* Camera Preview */}
        {!capturedImage && (
          <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-white text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Iniciando câmera...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
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
            
            {/* Camera overlay */}
            {isStreaming && !error && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-white rounded-full" />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {!capturedImage && isStreaming && !error && (
            <div className="space-y-3">
              <button
                onClick={capturePhoto}
                className="w-full h-12 rounded-full bg-black text-white font-medium"
              >
                {captureButtonText}
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full h-12 rounded-full bg-gray-100 text-gray-600 font-medium"
                >
                  Selecionar Arquivo
                </button>
              )}
            </div>
          )}

          {capturedImage && (
            <div className="space-y-3">
              <button
                onClick={confirmCapture}
                className="w-full h-12 rounded-full bg-black text-white font-medium"
              >
                {confirmButtonText}
              </button>

              <button
                onClick={retakePhoto}
                className="w-full h-12 rounded-full bg-gray-100 text-gray-600 font-medium"
              >
                {retakeButtonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
