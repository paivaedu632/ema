"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { FixedBottomAction } from '@/components/ui/fixed-bottom-action'

export function SupabaseLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔍 Attempting login with:', { email, password: '***' })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔍 Login response:', { data, error })

      if (error) {
        console.error('❌ Login error:', error)
        setError(`Login failed: ${error.message}`)
      } else if (data.user) {
        console.log('✅ Login successful:', data.user.email)
        // Redirect to dashboard or intended page
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect_url')
        router.push(redirectUrl || '/dashboard')
      } else {
        setError('Login failed: No user returned')
      }
    } catch (err) {
      console.error('❌ Login exception:', err)
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔍 Attempting sign up with:', { email, password: '***' })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      console.log('🔍 Sign up response:', { data, error })

      if (error) {
        console.error('❌ Sign up error:', error)
        setError(`Sign up failed: ${error.message}`)
      } else if (data.user) {
        console.log('✅ Sign up successful:', data.user.email)
        if (data.user.email_confirmed_at) {
          setError('Account created successfully! You can now sign in.')
        } else {
          setError('Account created! Check your email for confirmation link.')
        }
      } else {
        setError('Sign up failed: No user returned')
      }
    } catch (err) {
      console.error('❌ Sign up exception:', err)
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Login with Supabase"
          onBack={() => router.push('/')}
        />

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-3 border border-black rounded-lg focus:border-2 focus:border-black outline-none"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-3 border border-black rounded-lg focus:border-2 focus:border-black outline-none"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full h-12 bg-black text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading || !email || !password}
            className="w-full h-12 bg-gray-100 text-black rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Temporary Supabase Auth for development
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Use: paivaedu.br@gmail.com / password123
          </p>
        </div>
      </main>
    </div>
  )
}
