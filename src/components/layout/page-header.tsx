'use client'

import React from 'react'
import { BackButton } from '@/components/ui/back-button'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  className?: string
}

export function PageHeader({ title, subtitle, onBack, className = "" }: PageHeaderProps) {
  return (
    <div className={className}>
      <BackButton onClick={onBack || undefined} />

      <div className="mb-4">
        <h1 className="heading-main mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
