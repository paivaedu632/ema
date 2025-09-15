'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect /dashboard to / (main home page)
    router.replace('/')
  }, [router])

  return null
}
