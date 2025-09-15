'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface IconActionButtonsProps {
  className?: string
}

export function IconActionButtons({ className = "" }: IconActionButtonsProps) {
  const router = useRouter()

  const handleDepositar = () => {
    router.push('/deposit')
  }

  const handleEnviar = () => {
    router.push('/send')
  }

  const handleReceber = () => {
    router.push('/receive')
  }

  const handleRetirar = () => {
    router.push('/withdraw')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1">
        <Button
          onClick={handleDepositar}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Depositar
        </Button>
        <Button
          onClick={handleEnviar}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Enviar
        </Button>
        <Button
          onClick={handleReceber}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Receber
        </Button>
        <Button
          onClick={handleRetirar}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Retirar
        </Button>
      </div>
      {/* Scroll indicator gradient */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  )
}
