'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false
})

export function useAuthContext() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setUser(null)
          apiClient.removeAuthToken()
        } else if (session?.user) {
          setUser(session.user)
          // Set the auth token for API requests
          if (session.access_token) {
            apiClient.setAuthToken(session.access_token)
          }
        } else {
          setUser(null)
          apiClient.removeAuthToken()
        }
      } catch (error) {
        console.error('Session initialization error:', error)
        setUser(null)
        apiClient.removeAuthToken()
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Set the auth token for API requests
          if (session.access_token) {
            apiClient.setAuthToken(session.access_token)
            console.log('Auth token set for API client')
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          apiClient.removeAuthToken()
          console.log('Auth token removed from API client')
        } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          // Update token when refreshed
          apiClient.setAuthToken(session.access_token)
          console.log('Auth token refreshed for API client')
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
