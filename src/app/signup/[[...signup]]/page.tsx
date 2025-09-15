import { Signup } from '@/components/features/auth/signup'
import { PublicRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layout'

export default function SignupPage() {
  return (
    <PublicRoute>
      <AuthLayout>
        <Signup />
      </AuthLayout>
    </PublicRoute>
  )
}
