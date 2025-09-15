'use client'

import React from 'react'

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean
  background?: 'white' | 'gray' | 'transparent'
}

/**
 * Main layout wrapper for pages
 * Provides consistent spacing, max-width, and background styling
 */
export function MainLayout({ 
  children, 
  className = "",
  maxWidth = 'sm',
  padding = true,
  background = 'white'
}: MainLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  }

  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: 'bg-transparent'
  }

  const paddingClasses = padding ? 'px-4 pt-8 pb-6' : ''

  return (
    <div className={`min-h-screen ${backgroundClasses[background]}`}>
      <main className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses} ${className}`}>
        {children}
      </main>
    </div>
  )
}
