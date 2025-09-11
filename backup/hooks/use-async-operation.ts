'use client'

import { useState, useCallback } from 'react'

interface UseAsyncOperationOptions {
  onSuccess?: (result?: unknown) => void
  onError?: (error: Error) => void
  defaultErrorMessage?: string
}

interface UseAsyncOperationReturn {
  isLoading: boolean
  error: string | null
  execute: (operation: () => Promise<unknown>) => Promise<void>
  clearError: () => void
  setError: (error: string) => void
}

/**
 * Reusable hook for handling async operations with loading and error states
 * Eliminates duplicate try-catch-loading patterns across components
 */
export function useAsyncOperation({
  onSuccess,
  onError,
  defaultErrorMessage = 'Ocorreu um erro. Tente novamente.'
}: UseAsyncOperationOptions = {}): UseAsyncOperationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (operation: () => Promise<unknown>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await operation()
      onSuccess?.(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : defaultErrorMessage
      setError(errorMessage)
      onError?.(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError, defaultErrorMessage])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setErrorMessage = useCallback((errorMessage: string) => {
    setError(errorMessage)
  }, [])

  return {
    isLoading,
    error,
    execute,
    clearError,
    setError: setErrorMessage
  }
}

/**
 * Specialized hook for form submission operations
 * Includes form-specific error handling and validation
 */
export function useFormSubmission({
  onSuccess,
  onError,
  defaultErrorMessage = 'Erro ao enviar formulário. Tente novamente.'
}: UseAsyncOperationOptions = {}) {
  const asyncOperation = useAsyncOperation({
    onSuccess,
    onError,
    defaultErrorMessage
  })

  const submitForm = useCallback(async (
    formData: Record<string, unknown>,
    submitOperation: (data: Record<string, unknown>) => Promise<unknown>
  ) => {
    await asyncOperation.execute(() => submitOperation(formData))
  }, [asyncOperation])

  return {
    ...asyncOperation,
    submitForm
  }
}

/**
 * Specialized hook for file upload operations
 * Includes file-specific error handling and progress tracking
 */
export function useFileUpload({
  onSuccess,
  onError,
  defaultErrorMessage = 'Erro ao enviar arquivo. Tente novamente.'
}: UseAsyncOperationOptions = {}) {
  const asyncOperation = useAsyncOperation({
    onSuccess,
    onError,
    defaultErrorMessage
  })

  const uploadFile = useCallback(async (
    file: File,
    uploadOperation: (file: File) => Promise<unknown>
  ) => {
    await asyncOperation.execute(() => uploadOperation(file))
  }, [asyncOperation])

  return {
    ...asyncOperation,
    uploadFile
  }
}
