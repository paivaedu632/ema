"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { PageHeader } from "@/components/ui/page-header"
import { AuthFormField } from "@/components/ui/form-field"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { GoogleAuthButton } from "@/components/ui/google-auth-button"

export function Login() {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [emailOrPhone, setEmailOrPhone] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const canContinue = emailOrPhone.trim() !== "" && password.trim() !== ""

  const handleLogin = async () => {
    if (!canContinue || !isLoaded) return

    setIsLoading(true)
    setError("")

    try {
      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes("@")
      const identifier = isEmail ? emailOrPhone : emailOrPhone

      // Start the sign-in process using Clerk
      const result = await signIn.create({
        identifier,
        password,
      })

      if (result.status === "complete") {
        // Sign-in successful, set the active session
        await setActive({ session: result.createdSessionId })
        router.push("/dashboard")
      } else {
        // Handle other statuses (e.g., needs verification)
        console.log("Sign-in status:", result.status)
        setError("Login requires additional verification")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      // Handle Clerk-specific errors
      if (err.errors) {
        const errorMessage = err.errors[0]?.message || "Login failed"
        setError(errorMessage)
      } else {
        setError("An error occurred during login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return

    setError("")

    try {
      // Use Clerk's OAuth with proper redirect handling
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard"
      })
    } catch (err: any) {
      console.error("Google sign-in error:", err)
      if (err.errors) {
        const errorMessage = err.errors[0]?.message || "Google sign-in failed"
        setError(errorMessage)
      } else {
        setError("An error occurred with Google sign-in")
      }
    }
  }

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password flow
    console.log("Forgot password clicked")
  }

  const handleSignUp = () => {
    router.push("/signup")
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Entrar"
          onBack={handleBack}
        />

        <div className="space-y-6">
          <AuthFormField
            type="text"
            value={emailOrPhone}
            onChange={setEmailOrPhone}
            placeholder="Email ou telefone"
            required
          />

          <AuthFormField
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Senha"
            required
          />

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-black underline font-medium"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>

          {/* Google Sign-in Button - Secondary Action */}
          <GoogleAuthButton
            onClick={handleGoogleSignIn}
            variant="signin"
            disabled={isLoading}
          />
        </div>
      </main>

      {/* Sign Up Link - Bottom positioned */}
      <div className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto text-center">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{" "}
          <button 
            onClick={handleSignUp}
            className="text-black underline font-medium"
          >
            Criar conta
          </button>
        </p>
      </div>

      <FixedBottomAction
        primaryAction={{
          label: isLoading ? "Entrando..." : "Entrar",
          onClick: handleLogin,
          disabled: !canContinue || isLoading
        }}
      />
    </div>
  )
}
