'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseNavigationOptions {
  dashboardPath?: string
  homePath?: string
}

interface UseNavigationReturn {
  navigateTo: (path: string) => void
  navigateBack: () => void
  navigateToDashboard: () => void
  navigateToHome: () => void
  navigateWithParams: (path: string, params: Record<string, string>) => void
  replaceWith: (path: string) => void
}

/**
 * Reusable hook for navigation patterns
 * Consolidates common router.push() patterns across components
 */
export function useNavigation({
  dashboardPath = '/',
  homePath = '/'
}: UseNavigationOptions = {}): UseNavigationReturn {
  const router = useRouter()

  const navigateTo = useCallback((path: string) => {
    router.push(path)
  }, [router])

  const navigateBack = useCallback(() => {
    router.back()
  }, [router])

  const navigateToDashboard = useCallback(() => {
    router.push(dashboardPath)
  }, [router, dashboardPath])

  const navigateToHome = useCallback(() => {
    router.push(homePath)
  }, [router, homePath])

  const navigateWithParams = useCallback((path: string, params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params)
    router.push(`${path}?${searchParams.toString()}`)
  }, [router])

  const replaceWith = useCallback((path: string) => {
    router.replace(path)
  }, [router])

  return {
    navigateTo,
    navigateBack,
    navigateToDashboard,
    navigateToHome,
    navigateWithParams,
    replaceWith
  }
}

/**
 * Specialized hook for KYC flow navigation
 */
export function useKYCNavigation() {
  const navigation = useNavigation({ dashboardPath: '/' })

  const navigateToKYCStep = useCallback((step: string) => {
    navigation.navigateTo(`/kyc/${step}`)
  }, [navigation])

  const navigateToKYCSuccess = useCallback(() => {
    navigation.navigateTo('/kyc/success')
  }, [navigation])

  const navigateToKYCStart = useCallback(() => {
    navigation.navigateTo('/kyc/notifications')
  }, [navigation])

  return {
    ...navigation,
    navigateToKYCStep,
    navigateToKYCSuccess,
    navigateToKYCStart
  }
}

/**
 * Specialized hook for transaction flow navigation
 */
export function useTransactionNavigation() {
  const navigation = useNavigation()

  const navigateToTransaction = useCallback((type: 'buy' | 'sell' | 'send' | 'withdraw') => {
    navigation.navigateTo(`/${type}`)
  }, [navigation])

  const navigateToWallet = useCallback((currency?: string, type?: string, amount?: string) => {
    if (currency || type || amount) {
      const params: Record<string, string> = {}
      if (currency) params.currency = currency
      if (type) params.type = type
      if (amount) params.amount = amount
      navigation.navigateWithParams('/wallet', params)
    } else {
      navigation.navigateTo('/wallet')
    }
  }, [navigation])

  const navigateToDeposit = useCallback(() => {
    navigation.navigateTo('/deposit')
  }, [navigation])

  const navigateToReceive = useCallback(() => {
    navigation.navigateTo('/receive')
  }, [navigation])

  return {
    ...navigation,
    navigateToTransaction,
    navigateToWallet,
    navigateToDeposit,
    navigateToReceive
  }
}

/**
 * Specialized hook for auth flow navigation
 */
export function useAuthNavigation() {
  const navigation = useNavigation()

  const navigateToLogin = useCallback(() => {
    navigation.navigateTo('/login')
  }, [navigation])

  const navigateToSignup = useCallback(() => {
    navigation.navigateTo('/signup')
  }, [navigation])

  const navigateToSSOCallback = useCallback(() => {
    navigation.navigateTo('/sso-callback')
  }, [navigation])

  const navigateAfterAuth = useCallback(() => {
    // Always redirect to dashboard after successful authentication
    // KYC will be triggered contextually based on user actions
    navigation.navigateTo('/dashboard')
  }, [navigation])

  return {
    ...navigation,
    navigateToLogin,
    navigateToSignup,
    navigateToSSOCallback,
    navigateAfterAuth
  }
}
