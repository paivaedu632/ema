import { Login } from '@/components/features/auth/login'
import { PublicRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layout'

export default function LoginPage() {

  return (
    <PublicRoute>
      <AuthLayout>
        <Login />
      </AuthLayout>
    </PublicRoute>
  )
}
