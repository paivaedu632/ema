'use client'

import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut } from 'lucide-react'

interface AppHeaderProps {
  user?: {
    emailAddresses?: Array<{ emailAddress: string }>
  } | {
    userId?: string
    sessionId?: string
    authenticated?: boolean
    timestamp?: string
  } | null | undefined
  onSignOut?: () => void
  className?: string
}

/**
 * Main application header with user avatar and sign out button
 * Used across dashboard and other authenticated pages
 */
export function AppHeader({ user, onSignOut, className = "" }: AppHeaderProps) {
  // Get email from either user type
  const getEmailInitial = () => {
    if (user && 'emailAddresses' in user) {
      return user.emailAddresses?.[0]?.emailAddress?.charAt(0).toUpperCase() || 'U'
    }
    return 'U'
  }

  return (
    <div className={`flex justify-between items-center mb-8 ${className}`}>
      <Avatar className="w-12 h-12">
        <AvatarFallback>
          {getEmailInitial()}
        </AvatarFallback>
      </Avatar>
      
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  )
}
