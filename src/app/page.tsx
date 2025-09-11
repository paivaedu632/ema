import Dashboard from '@/components/features/dashboard'
import { ProtectedRoute } from '@/components/features/auth/protected-route'

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
