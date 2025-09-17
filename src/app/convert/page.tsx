import { Suspense } from 'react'
import ConvertPage from '@/components/features/convert/convert'
import { ProtectedRoute } from '@/components/auth/protected-route'

function ConvertPageContent() {
  return <ConvertPage />
}

export default function Convert() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="page-container-white">
          <main className="content-container">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Carregando...</div>
            </div>
          </main>
        </div>
      }>
        <ConvertPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
