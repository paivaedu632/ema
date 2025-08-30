'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, Plus, ArrowUp, ArrowDown, Landmark } from 'lucide-react'

/**
 * Unified Action Buttons - Circular Design Implementation
 *
 * This component displays all 6 financial action buttons using the circular
 * icon-based design with horizontal scrolling. The pill-shaped implementation
 * has been preserved in pill-action-buttons-backup.tsx for future use.
 */

interface UnifiedActionButtonsProps {
  className?: string
}

export function UnifiedActionButtons({ className = "" }: UnifiedActionButtonsProps) {
  const router = useRouter()

  const handleVender = () => {
    router.push('/sell')
  }

  const handleComprar = () => {
    // TODO: Implement buy functionality
    console.log('Buy functionality not yet implemented')
  }

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
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1">
        <button
          onClick={handleVender}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <TrendingDown className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Vender
          </span>
        </button>
        <button
          onClick={handleComprar}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <TrendingUp className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Comprar
          </span>
        </button>
        <button
          onClick={handleDepositar}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <Plus className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Depositar
          </span>
        </button>
        <button
          onClick={handleEnviar}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <ArrowUp className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Enviar
          </span>
        </button>
        <button
          onClick={handleReceber}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <ArrowDown className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Receber
          </span>
        </button>
        <button
          onClick={handleRetirar}
          className="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[80px]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
            <Landmark className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-sm text-gray-900 font-medium text-center leading-tight">
            Retirar
          </span>
        </button>
      </div>
      {/* Scroll indicator gradient */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  )
}

/*
 * BACKUP IMPLEMENTATION NOTES:
 *
 * The pill-shaped button implementation has been preserved in:
 * src/components/ui/pill-action-buttons-backup.tsx
 *
 * To switch back to pill-shaped buttons:
 * 1. Import PillActionButtonsBackup instead of UnifiedActionButtons
 * 2. Replace the component usage in dashboard.tsx
 * 3. The streamlined pill design will be restored
 */
