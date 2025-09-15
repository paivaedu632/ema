'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface InfoSectionProps {
  icon: LucideIcon
  label: string
  value: string
  actionButton?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function InfoSection({ 
  icon: Icon, 
  label, 
  value, 
  actionButton,
  className = '' 
}: InfoSectionProps) {
  return (
    <div className={`flex items-center justify-between py-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-900" />
        </div>
        <div>
          <div className="text-sm text-gray-900">{label}</div>
          <div className="text-base font-bold text-gray-900">{value}</div>
        </div>
      </div>
      {actionButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={actionButton.onClick}
          className="small-action-button"
        >
          {actionButton.label}
        </Button>
      )}
    </div>
  )
}

// Simplified version without action button
interface SimpleInfoSectionProps {
  icon: LucideIcon
  label: string
  value: string
  className?: string
}

export function SimpleInfoSection({ 
  icon: Icon, 
  label, 
  value,
  className = '' 
}: SimpleInfoSectionProps) {
  return (
    <div className={`flex items-center py-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-900" />
        </div>
        <div>
          <div className="text-sm text-gray-900">{label}</div>
          <div className="text-base font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  )
}
