'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowUp, ArrowDown, Landmark } from 'lucide-react'

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
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      <button
        onClick={handleDepositar}
        className="icon-action-button"
      >
        <div className="icon-action-circle">
          <Plus className="w-5 h-5 text-gray-900" />
        </div>
        <span className="text-sm text-gray-900 font-medium">Depositar</span>
      </button>
      <button
        onClick={handleEnviar}
        className="icon-action-button"
      >
        <div className="icon-action-circle">
          <ArrowUp className="w-5 h-5 text-gray-900" />
        </div>
        <span className="text-sm text-gray-900 font-medium">Enviar</span>
      </button>
      <button
        onClick={handleReceber}
        className="icon-action-button"
      >
        <div className="icon-action-circle">
          <ArrowDown className="w-5 h-5 text-gray-900" />
        </div>
        <span className="text-sm text-gray-900 font-medium">Receber</span>
      </button>
      <button
        onClick={handleRetirar}
        className="icon-action-button"
      >
        <div className="icon-action-circle">
          <Landmark className="w-5 h-5 text-gray-900" />
        </div>
        <span className="text-sm text-gray-900 font-medium">Retirar</span>
      </button>
    </div>
  )
}
