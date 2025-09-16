import { Suspense } from 'react'
import ConvertPage from '@/components/features/convert/convert-page'

function ConvertPageContent() {
  return <ConvertPage />
}

export default function Convert() {
  return (
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
  )
}
