'use client'

import { useUser, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

interface DiagnosticData {
  systemTime: string
  utcTime: string
  timeDifference: number
  clerkUser: {
    id?: string;
    emailAddresses?: Array<{ emailAddress: string }>;
    firstName?: string;
    lastName?: string;
    createdAt?: number;
    updatedAt?: number;
  } | null
  clerkAuth: {
    userId?: string | null;
    sessionId?: string | null;
    isLoaded: boolean;
  }
  apiTest: {
    success: boolean;
    data?: unknown;
    error?: string;
  }
  environmentCheck: {
    nodeEnv: string;
    clerkPublishableKey: boolean;
    clerkSecretKey: boolean;
    nextPublicAppUrl: boolean;
  }
}

export default function AuthDiagnosticPage() {
  const { user, isLoaded: userLoaded } = useUser()
  const { getToken, isLoaded: authLoaded } = useAuth()
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // System time check
        const now = new Date()
        const systemTime = now.toISOString()
        const utcTime = new Date().toUTCString()
        const timeDifference = now.getTimezoneOffset()

        // Clerk user data
        const clerkUser = userLoaded ? {
          isSignedIn: !!user,
          userId: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          createdAt: user?.createdAt,
          updatedAt: user?.updatedAt
        } : { loading: true }

        // Clerk auth data
        let clerkAuth = { loading: true }
        let apiTest = { loading: true }

        if (authLoaded) {
          try {
            const token = await getToken()
            clerkAuth = {
              hasToken: !!token,
              tokenLength: token?.length || 0,
              tokenPreview: token ? `${token.substring(0, 20)}...` : null
            }

            // Test API call with token
            const response = await fetch('/api/wallet/balances', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            apiTest = {
              status: response.status,
              statusText: response.statusText,
              success: response.ok,
              data: response.ok ? await response.json() : await response.text()
            }
          } catch (error) {
            clerkAuth = { error: error instanceof Error ? error.message : 'Unknown error' }
            apiTest = { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        }

        // Environment check
        const environmentCheck = {
          hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          publishableKeyPreview: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
          nodeEnv: process.env.NODE_ENV,
          currentUrl: window.location.href
        }

        setDiagnostics({
          systemTime,
          utcTime,
          timeDifference,
          clerkUser,
          clerkAuth,
          apiTest,
          environmentCheck
        })
      } catch (error) {
        console.error('Diagnostic error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userLoaded && authLoaded) {
      runDiagnostics()
    }
  }, [user, userLoaded, authLoaded, getToken])

  if (loading) {
    return <div className="p-8">Running diagnostics...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔍 EmaPay Authentication Diagnostics</h1>
      
      {diagnostics && (
        <div className="space-y-6">
          {/* Time Check */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">⏰ Time Synchronization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>System Time:</strong> {diagnostics.systemTime}
              </div>
              <div>
                <strong>UTC Time:</strong> {diagnostics.utcTime}
              </div>
              <div>
                <strong>Timezone Offset:</strong> {diagnostics.timeDifference} minutes
              </div>
              <div className={`font-semibold ${Math.abs(diagnostics.timeDifference) > 60 ? 'text-red-600' : 'text-green-600'}`}>
                <strong>Status:</strong> {Math.abs(diagnostics.timeDifference) > 60 ? '❌ Clock may be out of sync' : '✅ Clock appears synchronized'}
              </div>
            </div>
          </div>

          {/* Clerk User Status */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">👤 Clerk User Status</h2>
            <pre className="text-sm bg-white p-4 rounded overflow-auto">
              {JSON.stringify(diagnostics.clerkUser, null, 2)}
            </pre>
          </div>

          {/* Clerk Auth Status */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🔐 Clerk Authentication</h2>
            <pre className="text-sm bg-white p-4 rounded overflow-auto">
              {JSON.stringify(diagnostics.clerkAuth, null, 2)}
            </pre>
          </div>

          {/* API Test */}
          <div className="bg-purple-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🌐 API Test (/api/wallet/balances)</h2>
            <pre className="text-sm bg-white p-4 rounded overflow-auto">
              {JSON.stringify(diagnostics.apiTest, null, 2)}
            </pre>
          </div>

          {/* Environment Check */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">⚙️ Environment Configuration</h2>
            <pre className="text-sm bg-white p-4 rounded overflow-auto">
              {JSON.stringify(diagnostics.environmentCheck, null, 2)}
            </pre>
          </div>

          {/* Recommendations */}
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">💡 Recommendations</h2>
            <ul className="space-y-2 text-sm">
              {Math.abs(diagnostics.timeDifference) > 60 && (
                <li className="text-red-600">⚠️ <strong>Fix Clock Sync:</strong> Your system clock appears to be out of sync. Please synchronize your system time.</li>
              )}
              {!diagnostics.clerkUser.isSignedIn && (
                <li className="text-red-600">⚠️ <strong>Not Signed In:</strong> You are not currently signed in to Clerk.</li>
              )}
              {!diagnostics.clerkAuth.hasToken && diagnostics.clerkUser.isSignedIn && (
                <li className="text-red-600">⚠️ <strong>No Auth Token:</strong> Signed in but no authentication token available.</li>
              )}
              {diagnostics.apiTest.status === 401 && (
                <li className="text-red-600">⚠️ <strong>API Authentication Failed:</strong> The API is rejecting your authentication token.</li>
              )}
              {diagnostics.apiTest.success && (
                <li className="text-green-600">✅ <strong>API Working:</strong> Authentication and API calls are working correctly!</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-100 rounded-lg">
        <h3 className="font-semibold mb-2">🔧 Quick Fixes:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Synchronize your system clock (Windows: Settings → Time & Language → Date & Time → Sync now)</li>
          <li>Clear browser cache and cookies</li>
          <li>Sign out and sign back in to Clerk</li>
          <li>Restart the development server</li>
          <li>Check Clerk dashboard for key mismatches</li>
        </ol>
      </div>
    </div>
  )
}
