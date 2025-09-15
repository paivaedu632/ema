'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  center?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full'
}

const paddingClasses = {
  none: '',
  sm: 'px-4 py-2',
  md: 'px-6 py-4', 
  lg: 'px-8 py-6'
}

/**
 * Container component for consistent page layouts
 * Provides responsive width constraints and consistent padding
 */
export function Container({ 
  children, 
  className,
  size = 'md',
  padding = 'md',
  center = true
}: ContainerProps) {
  return (
    <div 
      className={cn(
        'w-full',
        sizeClasses[size],
        paddingClasses[padding],
        center && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Page container for full-page layouts
 * Includes minimum height and background styling
 */
export function PageContainer({ 
  children, 
  className,
  background = 'white'
}: {
  children: React.ReactNode
  className?: string
  background?: 'white' | 'gray' | 'none'
}) {
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    none: ''
  }

  return (
    <div 
      className={cn(
        'min-h-screen',
        backgroundClasses[background],
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Content container with safe areas for mobile
 * Includes padding for bottom navigation and status bars
 */
export function SafeContainer({ 
  children, 
  className,
  includeBottomNav = false
}: {
  children: React.ReactNode
  className?: string
  includeBottomNav?: boolean
}) {
  return (
    <div 
      className={cn(
        'safe-area-pt',
        includeBottomNav && 'safe-area-pb pb-20',
        className
      )}
    >
      {children}
    </div>
  )
}
