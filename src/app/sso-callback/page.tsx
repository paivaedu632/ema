"use client"

import { useEffect } from 'react'
// Clerk removed - using Supabase Auth
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'

export default function SSOCallback() {
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle Supabase auth callback
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        if (data.session) {
          // Redirect to dashboard after successful authentication
          router.push('/dashboard')
        } else {
          // No session, redirect to login
          router.push('/login')
        }
      } catch {
        // Redirect to login on error
        router.push('/login')
      }
    }

    handleCallback()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}
