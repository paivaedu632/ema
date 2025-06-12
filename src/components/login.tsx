"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { PageHeader } from "@/components/ui/page-header"
import { AuthFormField } from "@/components/ui/form-field"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { GoogleAuthButton } from "@/components/ui/google-auth-button"
import { useAsyncOperation } from "@/hooks/use-async-operation"
import { useAuthNavigation } from "@/hooks/use-navigation"
import { useFormValidation, ValidationRules } from "@/hooks/use-form-validation"

export function Login() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigation = useAuthNavigation()
  const { isLoading, error, execute, setError } = useAsyncOperation({
    defaultErrorMessage: "Ocorreu um erro durante o login"
  })

  const [emailOrPhone, setEmailOrPhone] = useState("")
  const [password, setPassword] = useState("")

  // Validation for login form
  const emailOrPhoneValidation = useFormValidation(emailOrPhone, {
    rules: [ValidationRules.nonEmpty],
    required: true,
    requiredMessage: "Email ou telefone é obrigatório"
  })

  const passwordValidation = useFormValidation(password, {
    rules: [ValidationRules.nonEmpty],
    required: true,
    requiredMessage: "Senha é obrigatória"
  })

  const canContinue = emailOrPhoneValidation.canContinue && passwordValidation.canContinue

  const handleLogin = async () => {
    if (!canContinue || !isLoaded) return

    await execute(async () => {
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
        navigation.navigateAfterAuth()
      } else {
        // Handle other statuses (e.g., needs verification)
        throw new Error("Login requires additional verification")
      }
    })
  }

  const handleBack = () => {
    navigation.navigateToHome()
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
  }

  const handleSignUp = () => {
    navigation.navigateToSignup()
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
