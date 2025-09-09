"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface KYCData {
  // Form data
  notificationsEnabled: boolean | null
  passcode: string
  passcodeConfirmation: string
  fullName: string
  dateOfBirth: string
  selectedCountry: string
  address: string
  idUploadImage: string | null
  biNumber: string
  selfieImage: string | null
  livenessCheckPassed: boolean | null
  idMatchingPassed: boolean | null
  idFrontImage: string | null
  idBackImage: string | null
  occupation: string
  incomeSource: string
  monthlyIncome: string
  isPEP: boolean | null
  appUse: string

  // BI validation state
  biValidationError: string
  isValidBI: boolean | null
  ocrExtractedBI: string

  // AWS processing states
  documentUploadStatus: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
  textExtractionStatus: 'idle' | 'processing' | 'completed' | 'failed'
  faceDetectionStatus: 'idle' | 'processing' | 'completed' | 'failed'
  livenessCheckStatus: 'idle' | 'processing' | 'completed' | 'failed'
  faceComparisonStatus: 'idle' | 'processing' | 'completed' | 'failed'

  // AWS processing results
  uploadedDocumentKeys: {
    idUpload?: string
    selfie?: string
    idFront?: string
    idBack?: string
  }
  extractedTextData: {
    confidence: number
    rawText: string
    documentNumber?: string
    fullName?: string
    dateOfBirth?: string
  } | null
  faceDetectionResults: {
    confidence: number
    faceDetected: boolean
    qualityScore?: number
  } | null
  livenessResults: {
    isLive: boolean
    confidence: number
    spoofingDetected: boolean
  } | null
  faceComparisonResults: {
    similarity: number
    isMatch: boolean
    confidence: number
  } | null
}

interface KYCContextType {
  data: KYCData
  updateData: (updates: Partial<KYCData>) => void
  validateBI: (biNumber: string) => Promise<void>
  clearData: () => void

  // AWS processing functions
  uploadDocument: (file: File, documentType: string, userId: string) => Promise<string>
  extractTextFromDocument: (s3Key: string) => Promise<void>
  detectFaceInImage: (s3Key: string) => Promise<void>
  performLivenessCheck: (s3Key: string) => Promise<void>
  compareFaces: (sourceS3Key: string, targetS3Key: string) => Promise<void>
}

const defaultKYCData: KYCData = {
  notificationsEnabled: null,
  passcode: '',
  passcodeConfirmation: '',
  fullName: '',
  dateOfBirth: '',
  selectedCountry: '',
  address: '',
  idUploadImage: null,
  biNumber: '',
  selfieImage: null,
  livenessCheckPassed: null,
  idMatchingPassed: null,
  idFrontImage: null,
  idBackImage: null,
  occupation: '',
  incomeSource: '',
  monthlyIncome: '',
  isPEP: null,
  appUse: '',
  biValidationError: '',
  isValidBI: null,
  ocrExtractedBI: '',

  // AWS processing states
  documentUploadStatus: 'idle',
  textExtractionStatus: 'idle',
  faceDetectionStatus: 'idle',
  livenessCheckStatus: 'idle',
  faceComparisonStatus: 'idle',

  // AWS processing results
  uploadedDocumentKeys: {},
  extractedTextData: null,
  faceDetectionResults: null,
  livenessResults: null,
  faceComparisonResults: null
}

const KYCContext = createContext<KYCContextType | undefined>(undefined)

export function KYCProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<KYCData>(defaultKYCData)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('kyc-data')
    if (savedData) {
      try {
        setData(JSON.parse(savedData))
      } catch {
        // Handle localStorage error silently
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kyc-data', JSON.stringify(data))
  }, [data])

  const updateData = useCallback((updates: Partial<KYCData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  // BI validation function
  const validateBI = useCallback(async (biNumber: string): Promise<void> => {
    if (!biNumber.trim()) {
      updateData({
        biValidationError: '',
        isValidBI: null
      })
      return
    }

    try {
      updateData({ biValidationError: '' })

      const response = await fetch(`/api/validate-bi/${biNumber}`)

      if (response.status === 200) {
        updateData({ isValidBI: true })
      } else if (response.status === 400) {
        updateData({
          isValidBI: false,
          biValidationError: 'Número de BI inválido'
        })
      } else {
        updateData({
          isValidBI: false,
          biValidationError: 'Erro ao validar BI. Tente novamente.'
        })
      }
    } catch {
      updateData({
        isValidBI: false,
        biValidationError: 'Erro ao validar BI. Tente novamente.'
      })
    }
  }, [updateData])

  const clearData = useCallback(() => {
    setData(defaultKYCData)
    localStorage.removeItem('kyc-data')
  }, [])

  // AWS processing functions
  const uploadDocument = useCallback(async (file: File, documentType: string, userId: string): Promise<string> => {
    try {
      updateData({ documentUploadStatus: 'uploading' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      formData.append('userId', userId)

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload document')
      }

      const result = await response.json()
      const s3Key = result.data.key

      updateData({
        documentUploadStatus: 'completed',
        uploadedDocumentKeys: {
          ...data.uploadedDocumentKeys,
          [documentType]: s3Key
        }
      })

      return s3Key
    } catch (error) {
      updateData({ documentUploadStatus: 'failed' })
      throw error
    }
  }, [updateData, data.uploadedDocumentKeys])

  const extractTextFromDocument = useCallback(async (s3Key: string): Promise<void> => {
    try {
      updateData({ textExtractionStatus: 'processing' })

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key })
      })

      if (!response.ok) {
        throw new Error('Failed to extract text')
      }

      const result = await response.json()

      updateData({
        textExtractionStatus: 'completed',
        extractedTextData: {
          confidence: result.data.confidence,
          rawText: result.data.rawText,
          documentNumber: result.data.extractedData.biNumber,
          fullName: result.data.extractedData.fullName,
          dateOfBirth: result.data.extractedData.dateOfBirth
        },
        ocrExtractedBI: result.data.extractedData.biNumber || '',
        biNumber: result.data.extractedData.biNumber || data.biNumber
      })

      // Auto-validate extracted BI if found
      if (result.data.extractedData.biNumber) {
        await validateBI(result.data.extractedData.biNumber)
      }
    } catch (error) {
      updateData({ textExtractionStatus: 'failed' })
      throw error
    }
  }, [updateData, validateBI, data.biNumber])

  const detectFaceInImage = useCallback(async (s3Key: string): Promise<void> => {
    try {
      updateData({ faceDetectionStatus: 'processing' })

      const response = await fetch('/api/detect-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key, validateQuality: true })
      })

      if (!response.ok) {
        throw new Error('Failed to detect face')
      }

      const result = await response.json()

      updateData({
        faceDetectionStatus: 'completed',
        faceDetectionResults: {
          confidence: result.data.confidence,
          faceDetected: result.data.faceDetected,
          qualityScore: result.data.qualityValidation?.confidence || 0
        }
      })
    } catch (error) {
      updateData({ faceDetectionStatus: 'failed' })
      throw error
    }
  }, [updateData])

  const performLivenessCheck = useCallback(async (s3Key: string): Promise<void> => {
    try {
      updateData({ livenessCheckStatus: 'processing' })

      const response = await fetch('/api/liveness-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key })
      })

      if (!response.ok) {
        throw new Error('Failed to perform liveness check')
      }

      const result = await response.json()

      updateData({
        livenessCheckStatus: 'completed',
        livenessResults: {
          isLive: result.data.isLive,
          confidence: result.data.confidence,
          spoofingDetected: result.data.spoofingDetected
        },
        livenessCheckPassed: result.data.isLive
      })
    } catch (error) {
      updateData({ livenessCheckStatus: 'failed' })
      throw error
    }
  }, [updateData])

  const compareFaces = useCallback(async (sourceS3Key: string, targetS3Key: string): Promise<void> => {
    try {
      updateData({ faceComparisonStatus: 'processing' })

      const response = await fetch('/api/compare-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceS3Key, targetS3Key })
      })

      if (!response.ok) {
        throw new Error('Failed to compare faces')
      }

      const result = await response.json()

      updateData({
        faceComparisonStatus: 'completed',
        faceComparisonResults: {
          similarity: result.data.similarity,
          isMatch: result.data.isMatch,
          confidence: result.data.confidence
        },
        idMatchingPassed: result.data.isMatch
      })
    } catch (error) {
      updateData({ faceComparisonStatus: 'failed' })
      throw error
    }
  }, [updateData])

  return (
    <KYCContext.Provider value={{
      data,
      updateData,
      validateBI,
      clearData,
      uploadDocument,
      extractTextFromDocument,
      detectFaceInImage,
      performLivenessCheck,
      compareFaces
    }}>
      {children}
    </KYCContext.Provider>
  )
}

export function useKYC() {
  const context = useContext(KYCContext)
  if (context === undefined) {
    throw new Error('useKYC must be used within a KYCProvider')
  }
  return context
}
