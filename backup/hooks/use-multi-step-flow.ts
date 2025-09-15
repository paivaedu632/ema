'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseMultiStepFlowOptions<T> {
  initialStep: T
  steps: T[]
  onStepChange?: (step: T) => void
  canProceed?: (step: T) => boolean
}

interface UseMultiStepFlowReturn<T> {
  currentStep: T
  currentStepIndex: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  setStep: (step: T) => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (stepIndex: number) => void
  canGoNext: boolean
  canGoBack: boolean
}

export function useMultiStepFlow<T extends string | number>({
  initialStep,
  steps,
  onStepChange,
  canProceed
}: UseMultiStepFlowOptions<T>): UseMultiStepFlowReturn<T> {
  const [currentStep, setCurrentStep] = useState<T>(initialStep)

  const currentStepIndex = steps.indexOf(currentStep)
  const totalSteps = steps.length
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  const canGoNext = canProceed ? canProceed(currentStep) : true
  const canGoBack = !isFirstStep

  const setStep = useCallback((step: T) => {
    if (steps.includes(step)) {
      setCurrentStep(step)
      onStepChange?.(step)
    }
  }, [steps, onStepChange])

  const nextStep = useCallback(() => {
    if (!isLastStep && canGoNext) {
      const nextStepIndex = currentStepIndex + 1
      const nextStep = steps[nextStepIndex]
      setStep(nextStep)
    }
  }, [currentStepIndex, isLastStep, canGoNext, steps, setStep])

  const previousStep = useCallback(() => {
    if (!isFirstStep) {
      const prevStepIndex = currentStepIndex - 1
      const prevStep = steps[prevStepIndex]
      setStep(prevStep)
    }
  }, [currentStepIndex, isFirstStep, steps, setStep])

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      const step = steps[stepIndex]
      setStep(step)
    }
  }, [totalSteps, steps, setStep])

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    setStep,
    nextStep,
    previousStep,
    goToStep,
    canGoNext,
    canGoBack
  }
}

// Enhanced hook for transaction flows with common patterns
interface UseTransactionFlowOptions {
  initialStep: string
  steps: string[]
  onComplete?: () => void
  dashboardPath?: string
}

interface UseTransactionFlowReturn {
  currentStep: string
  currentStepIndex: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  setStep: (step: string) => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (stepIndex: number) => void
  handleBack: () => void
  handleBackToDashboard: () => void
  handleBackToHome: () => void
}

export function useTransactionFlow({
  initialStep,
  steps,
  onComplete,
  dashboardPath = "/"
}: UseTransactionFlowOptions): UseTransactionFlowReturn {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep)

  const currentStepIndex = steps.indexOf(currentStep)
  const totalSteps = steps.length
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  const setStep = useCallback((step: string) => {
    if (steps.includes(step)) {
      setCurrentStep(step)
    }
  }, [steps])

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      const nextStepIndex = currentStepIndex + 1
      const nextStep = steps[nextStepIndex]
      setStep(nextStep)
    } else if (onComplete) {
      onComplete()
    }
  }, [currentStepIndex, isLastStep, steps, setStep, onComplete])

  const previousStep = useCallback(() => {
    if (!isFirstStep) {
      const prevStepIndex = currentStepIndex - 1
      const prevStep = steps[prevStepIndex]
      setStep(prevStep)
    }
  }, [currentStepIndex, isFirstStep, steps, setStep])

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      const step = steps[stepIndex]
      setStep(step)
    }
  }, [totalSteps, steps, setStep])

  const handleBackToDashboard = useCallback(() => {
    router.push(dashboardPath)
  }, [router, dashboardPath])

  const handleBackToHome = useCallback(() => {
    router.push(dashboardPath)
  }, [router, dashboardPath])

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      handleBackToDashboard()
    } else {
      previousStep()
    }
  }, [isFirstStep, handleBackToDashboard, previousStep])

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    setStep,
    nextStep,
    previousStep,
    goToStep,
    handleBack,
    handleBackToDashboard,
    handleBackToHome
  }
}
