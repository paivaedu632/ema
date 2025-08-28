'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function ClerkSessionDebugPage() {
  const { user, isLoaded } = useUser()
  const [sessionInfo, setSessionInfo] = useState<{
    clerk_user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
    updated_at: string;
  } | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      setSessionInfo({
        clerk_user_id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
        <p>Please log in to see your Clerk session information.</p>
        <a href="/login" className="text-blue-600 underline">Go to Login</a>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Clerk Session Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Current Session Info:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Copy the <code>clerk_user_id</code> value above</li>
          <li>Use this ID to update your database user record</li>
          <li>Test the wallet balance API integration</li>
        </ol>
      </div>
    </div>
  )
}
