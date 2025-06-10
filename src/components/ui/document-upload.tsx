"use client"

import React, { useState, useRef, useCallback } from "react"
import { Upload, Camera, FileImage, X, Check } from "lucide-react"

interface DocumentUploadProps {
  onUpload: (file: File) => void
  onCancel?: () => void
  acceptedTypes?: string[]
  maxSizeInMB?: number
  title?: string
  description?: string
  showCameraOption?: boolean
  showFileOption?: boolean
  className?: string
}

export function DocumentUpload({
  onUpload,
  onCancel,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
  maxSizeInMB = 10,
  title = "Enviar Documento",
  description = "Tire uma foto ou selecione um arquivo",
  showCameraOption = true,
  showFileOption = true,
  className = ''
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Tipo de arquivo não suportado. Use: ${acceptedTypes.join(', ')}`
    }
    
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeInMB}MB`
    }
    
    return null
  }, [acceptedTypes, maxSizeInMB])

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError(null)
    setSelectedFile(file)
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [validateFile])

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Confirm upload
  const confirmUpload = useCallback(async () => {
    if (!selectedFile) return
    
    setIsUploading(true)
    try {
      await onUpload(selectedFile)
    } catch (error) {
      setError('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, onUpload])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div className={`document-upload ${className}`}>
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h3 className="heading-step">{title}</h3>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>

        {/* File Preview */}
        {selectedFile && previewUrl && (
          <div className="mb-6">
            <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={clearSelection}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        {/* Upload Options */}
        {!selectedFile && (
          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors
                ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300'}
                ${showFileOption ? 'cursor-pointer hover:border-gray-400' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={showFileOption ? openFilePicker : undefined}
            >
              <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">
                {showFileOption ? 'Clique para selecionar ou arraste um arquivo' : 'Arraste um arquivo aqui'}
              </p>
              <p className="text-sm text-gray-500">
                Formatos: JPEG, PNG • Máximo: {maxSizeInMB}MB
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {showCameraOption && (
                <button
                  onClick={() => {/* Camera functionality will be handled by parent */}}
                  className="flex-1 h-12 rounded-full bg-gray-100 flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Câmera</span>
                </button>
              )}
              
              {showFileOption && (
                <button
                  onClick={openFilePicker}
                  className="flex-1 h-12 rounded-full bg-gray-100 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Arquivo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirm Upload */}
        {selectedFile && (
          <div className="flex space-x-3">
            <button
              onClick={clearSelection}
              className="flex-1 h-12 rounded-full bg-gray-100 flex items-center justify-center"
              disabled={isUploading}
            >
              <span className="text-gray-600 font-medium">Cancelar</span>
            </button>
            
            <button
              onClick={confirmUpload}
              className="flex-1 h-12 rounded-full bg-black flex items-center justify-center space-x-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5 text-white" />
              )}
              <span className="text-white font-medium">
                {isUploading ? 'Enviando...' : 'Confirmar'}
              </span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Cancel Button */}
        {onCancel && !selectedFile && (
          <div className="mt-6 text-center">
            <button
              onClick={onCancel}
              className="text-gray-500 text-sm underline"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
