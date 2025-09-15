'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export interface AuthUser {
  userId: string
  sessionId: string
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

  // Get current user
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser
  } = useQuery({
    queryKey: authQueryKeys.user,
    queryFn: async () => {
      const response = await apiClient.get<AuthUser>('/auth/me')
      if (!response.success) {
        // Return null for authentication failures instead of throwing
        // This allows the component to render the login form
        return null
      }
      return response.data!
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/auth/login', credentials)
      if (!response.success) {
        throw new Error(response.error || 'Login failed')
      }
      return response.data!
    },
    onSuccess: (data) => {
      // Set auth token in API client
      apiClient.setAuthToken(data.token)
      
      // Update user cache
      queryClient.setQueryData(authQueryKeys.user, data.user)
      
      // Navigate to dashboard
      router.push('/dashboard')
    },
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (signupData: SignupData) => {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/auth/signup', signupData)
      if (!response.success) {
        throw new Error(response.error || 'Signup failed')
      }
      return response.data!
    },
    onSuccess: (data) => {
      // Set auth token in API client
      apiClient.setAuthToken(data.token)
      
      // Update user cache
      queryClient.setQueryData(authQueryKeys.user, data.user)
      
      // Navigate to dashboard
      router.push('/dashboard')
    },
  })

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      // Remove auth token
      apiClient.removeAuthToken()
      
      // Clear all cached data
      queryClient.clear()
      
      // Navigate to login
      router.push('/login')
    }
  }, [queryClient, router])

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
