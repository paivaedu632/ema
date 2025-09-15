'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/**
 * BACKUP IMPLEMENTATION - Pill-Shaped Action Buttons
 * 
 * This component contains the streamlined pill-shaped button design
 * that was previously implemented. It's preserved here for future use
 * in case we want to switch back to the pill-shaped design.
 * 
 * Features:
 * - Compact sizing (h-10, min-w-[100px])
 * - Horizontal scrolling layout
 * - Clean text-only labels (no icons)
 * - Modern fintech aesthetic
 * - Space-efficient design
 * - Reduced visual clutter
 */

interface PillActionButtonsBackupProps {
  className?: string
}

export function PillActionButtonsBackup({ className = "" }: PillActionButtonsBackupProps) {
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
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1">
        <Button
          onClick={handleVender}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Vender
        </Button>
        <Button
          onClick={handleComprar}
          className="flex-shrink-0 h-10 px-4 bg-gray-100 text-gray-900 border border-gray-100 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm min-w-[100px]"
        >
          Comprar
        </Button>
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

/**
 * USAGE INSTRUCTIONS:
 * 
 * To switch back to pill-shaped buttons in the future:
 * 
 * 1. In dashboard.tsx, replace:
 *    import { UnifiedActionButtons } from '@/components/ui/unified-action-buttons'
 *    with:
 *    import { PillActionButtonsBackup } from '@/components/ui/pill-action-buttons-backup'
 * 
 * 2. Replace the component usage:
 *    <UnifiedActionButtons className="mt-6 mb-8" />
 *    with:
 *    <PillActionButtonsBackup className="mt-6 mb-8" />
 * 
 * 3. The pill-shaped design will be restored with all functionality intact.
 */
