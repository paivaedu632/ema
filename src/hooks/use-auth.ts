'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  userId: string
  email?: string
  emailVerified: boolean
  authenticated: boolean
  timestamp: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

// Query keys for auth
export const authQueryKeys = {
  user: ['auth', 'user'] as const,
  session: ['auth', 'session'] as const,
}

/**
 * Hook for managing user authentication state
 */
export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Get current user from Supabase
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser
  } = useQuery({
    queryKey: authQueryKeys.user,
    queryFn: async () => {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
      if (error || !supabaseUser) {
        return null
      }

      // Convert Supabase user to AuthUser format
      return {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        emailVerified: !!supabaseUser.email_confirmed_at,
        authenticated: true,
        timestamp: new Date().toISOString()
      } as AuthUser
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Login mutation using Supabase
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no user or session returned')
      }

      // Convert to AuthUser format
      return {
        userId: data.user.id,
        email: data.user.email,
        emailVerified: !!data.user.email_confirmed_at,
        authenticated: true,
        timestamp: new Date().toISOString()
      } as AuthUser
    },
    onSuccess: (user) => {
      // Update user cache
      queryClient.setQueryData(authQueryKeys.user, user)

      // Navigate to dashboard
      router.push('/')
    },
  })

  // Signup mutation using Supabase
  const signupMutation = useMutation({
    mutationFn: async (signupData: SignupData) => {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned')
      }

      // Convert to AuthUser format
      return {
        userId: data.user.id,
        email: data.user.email,
        emailVerified: !!data.user.email_confirmed_at,
        authenticated: true,
        timestamp: new Date().toISOString()
      } as AuthUser
    },
    onSuccess: (user) => {
      // Update user cache
      queryClient.setQueryData(authQueryKeys.user, user)

      // Navigate to dashboard
      router.push('/')
    },
  })

  // Logout function using Supabase
  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Logout failed:', error)
    } finally {
      // Clear all cached data
      queryClient.clear()

      // Navigate to login
      router.push('/login')
    }
  }, [queryClient, router, supabase.auth])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refetch user data when signed in or token refreshed
        refetchUser()
      } else if (event === 'SIGNED_OUT') {
        // Clear user data when signed out
        queryClient.setQueryData(authQueryKeys.user, null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, refetchUser, queryClient])

  // Check if user is authenticated
  const isAuthenticated = !!user?.authenticated

  // Check if user is loading
  const isAuthLoading = isLoading

  return {
    // User state
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    error,
    
    // Actions
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout,
    refetchUser,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
  }
}

/**
 * Hook for protecting routes that require authentication
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login')
    return { isLoading: true, isAuthenticated: false }
  }

  return { isLoading, isAuthenticated }
}

/**
 * Hook for redirecting authenticated users away from auth pages
 */
export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to dashboard if already authenticated
  if (!isLoading && isAuthenticated) {
    router.push('/dashboard')
    return { isLoading: true, isAuthenticated: true }
  }

  return { isLoading, isAuthenticated }
}
