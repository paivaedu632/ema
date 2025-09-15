'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PrimaryActionButtonsProps {
  className?: string
}

export function PrimaryActionButtons({ className = "" }: PrimaryActionButtonsProps) {
  const handleComprar = () => {
    // TODO: Implement buy functionality
    console.log('Buy functionality not yet implemented')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1">
        <Button
          onClick={handleComprar}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Comprar
        </Button>
      </div>
      {/* Scroll indicator gradient */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  )
}
