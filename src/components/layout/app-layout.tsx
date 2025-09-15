'use client'

import React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from './app-header'
import { BottomNav, BottomNavSpacer } from './bottom-nav'
import { Container, SafeContainer } from './container'
import { usePathname } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showBottomNav?: boolean
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

// Routes that should not show bottom navigation
const NO_BOTTOM_NAV_ROUTES = [
  '/login',
  '/signup',
  '/sso-callback',
  '/kyc',
  '/onboarding'
]

// Routes that should not show header
const NO_HEADER_ROUTES = [
  '/login',
  '/signup',
  '/sso-callback'
]

/**
 * Main application layout component
 * Handles responsive layout with header and bottom navigation
 */
export function AppLayout({ 
  children, 
  showHeader,
  showBottomNav,
  containerSize = 'md',
  className = ''
}: AppLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Determine if we should show header/nav based on route
  const shouldShowHeader = showHeader ?? !NO_HEADER_ROUTES.some(route => pathname.startsWith(route))
  const shouldShowBottomNav = showBottomNav ?? !NO_BOTTOM_NAV_ROUTES.some(route => pathname.startsWith(route))

  return (
    <div className={`min-h-screen bg-white ${className}`}>
      <SafeContainer includeBottomNav={shouldShowBottomNav}>
        {/* Header */}
        {shouldShowHeader && (
          <AppHeader 
            user={user}
            onSignOut={logout}
            className="px-4 pt-4"
          />
        )}

        {/* Main Content */}
        <main className="flex-1">
          <Container size={containerSize} className="pb-4">
            {children}
          </Container>
        </main>

        {/* Bottom Navigation Spacer */}
        {shouldShowBottomNav && <BottomNavSpacer />}
      </SafeContainer>

      {/* Bottom Navigation */}
      {shouldShowBottomNav && <BottomNav />}
    </div>
  )
}

/**
 * Dashboard layout with full navigation
 */
export function DashboardLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <AppLayout 
      showHeader={true}
      showBottomNav={true}
      containerSize="md"
      className={className}
    >
      {children}
    </AppLayout>
  )
}

/**
 * Auth layout without navigation
 */
export function AuthLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <AppLayout 
      showHeader={false}
      showBottomNav={false}
      containerSize="sm"
      className={className}
    >
      {children}
    </AppLayout>
  )
}

/**
 * Full-width layout for special pages
 */
export function FullWidthLayout({ 
  children, 
  showHeader = false,
  showBottomNav = false,
  className = '' 
}: { 
  children: React.ReactNode
  showHeader?: boolean
  showBottomNav?: boolean
  className?: string 
}) {
  return (
    <AppLayout 
      showHeader={showHeader}
      showBottomNav={showBottomNav}
      containerSize="full"
      className={className}
    >
      {children}
    </AppLayout>
  )
}

/**
 * Modal layout for overlay content
 */
export function ModalLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`fixed inset-0 z-50 bg-white ${className}`}>
      <SafeContainer>
        {children}
      </SafeContainer>
    </div>
  )
}
