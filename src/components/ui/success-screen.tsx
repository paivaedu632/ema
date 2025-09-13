'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SuccessScreenProps {
  title: string
  message: string | React.ReactNode
  primaryAction?: {
    label: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
  }
  icon?: React.ReactNode
  className?: string
}

const DefaultSuccessIcon = () => (
  <div className="w-24 h-24 flex items-center justify-center mb-8">
    <svg
      className="w-20 h-20 text-black"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  </div>
)

export function SuccessScreen({
  title,
  message,
  primaryAction,
  secondaryAction,
  icon,
  className = ""
}: SuccessScreenProps) {
  const router = useRouter()

  const handlePrimaryAction = () => {
    if (primaryAction?.onClick) {
      primaryAction.onClick()
    } else {
      router.push("/")
    }
  }

  const handleSecondaryAction = () => {
    if (secondaryAction?.onClick) {
      secondaryAction.onClick()
    } else {
      router.push("/")
    }
  }

  return (
    <div className={`min-h-screen bg-white flex flex-col ${className}`}>
      <main className="max-w-sm mx-auto px-4 pt-8 pb-24 flex flex-col justify-center items-center text-center flex-1">
        {/* Success Icon */}
        {icon || <DefaultSuccessIcon />}

        {/* Success Message */}
        <div className="mb-8">
          <h1 className="heading-main mb-4">
            {title}
          </h1>
          <p className="text-body">
            {message}
          </p>
        </div>
      </main>

      {/* Action Buttons */}
      <div className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto space-y-4">
        {primaryAction && (
          <Button
            onClick={handlePrimaryAction}
            className="primary-action-button"
          >
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={handleSecondaryAction}
            variant="outline"
            className="outline-secondary-button"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
