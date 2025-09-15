'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface FixedBottomActionProps {
  children?: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
    className?: string
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    className?: string
  }
  className?: string
}

export function FixedBottomAction({
  children,
  primaryAction,
  secondaryAction,
  className = ""
}: FixedBottomActionProps) {
  if (children) {
    return (
      <div className={`fixed-bottom-container ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`fixed-bottom-container space-y-4 ${className}`}>
      {primaryAction && (
        <Button
          onClick={primaryAction.onClick}
          className={primaryAction.className || "primary-action-button"}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          onClick={secondaryAction.onClick}
          variant="outline"
          className={secondaryAction.className || "outline-secondary-button"}
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  )
}
