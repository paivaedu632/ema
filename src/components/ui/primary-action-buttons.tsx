'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PrimaryActionButtonsProps {
  className?: string
}

export function PrimaryActionButtons({ className = "" }: PrimaryActionButtonsProps) {
  const router = useRouter()

  const handleVender = () => {
    router.push('/sell')
  }

  const handleComprar = () => {
    // TODO: Implement buy functionality
    console.log('Buy functionality not yet implemented')
  }

  return (
    <div className={`flex space-x-3 ${className}`}>
      <Button
        onClick={handleVender}
        className="secondary-action-button"
      >
        Vender
      </Button>
      <Button
        onClick={handleComprar}
        className="secondary-action-button"
      >
        Comprar
      </Button>
    </div>
  )
}
