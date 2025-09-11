'use client'

import React from 'react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function StepIndicator({
  currentStep,
  totalSteps,
  className = ""
}: StepIndicatorProps) {
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div
            key={stepNumber}
            className={`
              w-2 h-2 rounded-full transition-colors
              ${isActive ? 'bg-black' : isCompleted ? 'bg-gray-400' : 'bg-gray-200'}
            `}
          />
        )
      })}
    </div>
  )
}
