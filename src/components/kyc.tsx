"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function KYC() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the first step of the KYC flow
    router.push("/kyc/notifications")
  }, [router])

  return (
    <div className="page-container-white">
      <main className="content-container">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Redirecionando para o processo KYC...</p>
        </div>
      </main>
    </div>
  )
}
