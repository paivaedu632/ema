'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  onClick?: () => void
  className?: string
}

export function BackButton({ onClick, className = "" }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={`w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-100 back-button ${className}`}
      data-testid="back-button"
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  )
}
