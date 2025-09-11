'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface DetailRowProps {
  label: string
  value: string
  fieldName?: string
  showCopyButton?: boolean
  className?: string
}

export function DetailRow({ 
  label, 
  value, 
  fieldName, 
  showCopyButton = true,
  className = '' 
}: DetailRowProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Silently fail if clipboard access is not available
    }
  }

  const isCopied = copiedField === fieldName

  return (
    <div className={`flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0 ${className}`}>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-base font-bold text-gray-900">{value}</div>
      </div>
      {showCopyButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(value, fieldName || label)}
          className={`copy-button ${isCopied ? "copied" : ""}`}
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copiado
            </>
          ) : (
            "Copiar"
          )}
        </Button>
      )}
    </div>
  )
}

// Simple detail row without copy functionality for confirmation screens
interface SimpleDetailRowProps {
  label: string
  value: string
  className?: string
}

export function SimpleDetailRow({ label, value, className = '' }: SimpleDetailRowProps) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
