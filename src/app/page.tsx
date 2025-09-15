import Dashboard from '@/components/features/dashboard'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
