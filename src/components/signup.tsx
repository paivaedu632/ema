"use client"

import { useState, useEffect } from "react"
import { useSignUp } from "@clerk/nextjs"
import { PageHeader } from "@/components/ui/page-header"
import { AuthFormField } from "@/components/ui/form-field"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { CodeInput } from "@/components/ui/code-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { GoogleAuthButton } from "@/components/ui/google-auth-button"
import { useAsyncOperation } from "@/hooks/use-async-operation"
import { useAuthNavigation } from "@/hooks/use-navigation"
import {
  useEmailValidation,
  usePasswordValidation,
  usePhoneValidation,
  useVerificationCodeValidation
} from "@/hooks/use-form-validation"

type Step = "email" | "email-verification" | "phone" | "phone-verification" | "password"

export function Signup() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const navigation = useAuthNavigation()
  const { isLoading, error, execute, setError } = useAsyncOperation({
    defaultErrorMessage: "Ocorreu um erro durante o cadastro"
  })

  const [currentStep, setCurrentStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [emailVerificationCode, setEmailVerificationCode] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("+244") // Full phone number with country code
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("")
  const [password, setPassword] = useState("")
  const [countdown, setCountdown] = useState(119) // 1:59 in seconds
  const [canResend, setCanResend] = useState(false)

  // Validation hooks
  const emailValidation = useEmailValidation(email)
  const passwordValidation = usePasswordValidation(password)
  const phoneValidation = usePhoneValidation(phoneNumber)
  const emailCodeValidation = useVerificationCodeValidation(emailVerificationCode)
  const phoneCodeValidation = useVerificationCodeValidation(phoneVerificationCode)

  // Countdown timer effect
  useEffect(() => {
    if ((currentStep === "email-verification" || currentStep === "phone-verification") && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentStep, countdown])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleBack = () => {
    if (currentStep === "password") {
      setCurrentStep("phone-verification")
    } else if (currentStep === "phone-verification") {
      setCurrentStep("phone")
    } else if (currentStep === "phone") {
      setCurrentStep("email-verification")
    } else if (currentStep === "email-verification") {
      setCurrentStep("email")
    } else {
      navigation.navigateBack()
    }
  }

  const handleNext = async () => {
    if (!isLoaded) return

    await execute(async () => {
      if (currentStep === "email") {
        // Start the sign-up process with Clerk
        await signUp.create({
          emailAddress: email,
        })

        // Send email verification code
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" })

        // Move to email verification step
        setCurrentStep("email-verification")
        setCountdown(119) // Reset countdown
        setCanResend(false)
      } else if (currentStep === "email-verification") {
        // Verify email code with Clerk
        const result = await signUp.attemptEmailAddressVerification({
          code: emailVerificationCode,
        })

        if (result.status === "complete") {
          // Email verified, move to phone step
          setCurrentStep("phone")
        } else {
          throw new Error("Invalid verification code")
        }
      } else if (currentStep === "phone") {
        // Add phone number to the sign-up
        await signUp.update({
          phoneNumber: phoneNumber,
        })

        // Send phone verification code
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" })

        // Move to phone verification step
        setCurrentStep("phone-verification")
        setCountdown(119) // Reset countdown
        setCanResend(false)
      } else if (currentStep === "phone-verification") {
        // Verify phone code with Clerk
        const result = await signUp.attemptPhoneNumberVerification({
          code: phoneVerificationCode,
        })

        if (result.status === "complete") {
          // Phone verified, move to password step
          setCurrentStep("password")
        } else {
          throw new Error("Invalid verification code")
        }
      } else {
        // Handle password creation and complete signup
        const result = await signUp.update({
          password: password,
        })

        if (result.status === "complete") {
          // Sign-up complete, set active session
          await setActive({ session: result.createdSessionId })
          navigation.navigateAfterAuth()
        } else {
          throw new Error("Failed to complete signup")
        }
      }
    })
  }

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return

    setError("")

    try {
      // Use Clerk's OAuth with proper redirect handling
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard"
      })
    } catch (err: any) {
      if (err.errors) {
        const errorMessage = err.errors[0]?.message || "Google sign-up failed"
        setError(errorMessage)
      } else {
        setError("An error occurred with Google sign-up")
      }
    }
  }

  const handleResendCode = async () => {
    if (!canResend || !isLoaded) return

    await execute(async () => {
      if (currentStep === "email-verification") {
        // Resend email verification code
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      } else if (currentStep === "phone-verification") {
        // Resend phone verification code
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" })
      }

      setCountdown(119) // Reset countdown
      setCanResend(false)
    })
  }

  // Validation states for each step
  const canContinueEmail = emailValidation.canContinue
  const canContinueEmailVerification = emailCodeValidation.canContinue
  const canContinuePhone = phoneValidation.canContinue
  const canContinuePhoneVerification = phoneCodeValidation.canContinue
  const canContinuePassword = passwordValidation.canContinue

  // Step 1: Email input
  if (currentStep === "email") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Qual seu Email?"
            onBack={handleBack}
          />

          <div className="space-y-6">
            <AuthFormField
              type="email"
              value={email}
              onChange={setEmail}
              placeholder=""
              required
            />

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-700 text-center">
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">ou</span>
              </div>
            </div>

            {/* Google Sign-up Button - Secondary Action */}
            <GoogleAuthButton
              onClick={handleGoogleSignUp}
              variant="signup"
              disabled={isLoading}
            />
          </div>
        </main>

        {/* Terms and Privacy - Bottom positioned */}
        <div className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto text-center">
          <p className="text-sm text-gray-600">
            By signing up you agree to our{" "}
            <button className="text-black underline font-medium">
              Terms of Use
            </button>
            {" "}and{" "}
            <button className="text-black underline font-medium">
              Privacy Policy
            </button>
          </p>
        </div>

        <FixedBottomAction
          primaryAction={{
            label: isLoading ? "Enviando..." : "Continuar",
            onClick: handleNext,
            disabled: !canContinueEmail || isLoading
          }}
        />
      </div>
    )
  }

  // Step 2: Email verification
  if (currentStep === "email-verification") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title={`Enviamos o código para ${email}`}
            onBack={handleBack}
          />

          <div className="space-y-6">
            <CodeInput
              length={6}
              value={emailVerificationCode}
              onChange={setEmailVerificationCode}
            />

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-700 text-center">
                {error}
              </div>
            )}
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: isLoading ? "Verificando..." : "Continuar",
            onClick: handleNext,
            disabled: !canContinueEmailVerification || isLoading
          }}
          secondaryAction={canResend ? {
            label: isLoading ? "Reenviando..." : "Reenviar código",
            onClick: handleResendCode
          } : {
            label: `Reenviar em ${formatTime(countdown)}`,
            onClick: () => {}, // Empty function when disabled
            className: "outline-secondary-button opacity-50 cursor-not-allowed"
          }}
        />
      </div>
    )
  }

  // Step 3: Phone number input
  if (currentStep === "phone") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Qual seu telefone?"
            onBack={handleBack}
          />

          <div className="space-y-6">
            {/* Integrated Phone Input */}
            <PhoneInput
              value={phoneNumber}
              onChange={setPhoneNumber}
            />

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-700 text-center">
                {error}
              </div>
            )}

            {/* Login Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Já tem conta?{" "}
                <button
                  className="text-black underline font-medium"
                  onClick={() => navigation.navigateToLogin()}
                >
                  Entrar
                </button>
              </span>
            </div>
          </div>
        </main>

        {/* Terms and Conditions - Bottom positioned */}
        <div className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto text-center">
          <p className="text-sm text-gray-600">
            Ao continuar você concorda com nossos{" "}
            <button className="text-black underline font-medium">
              Termos & Condições
            </button>
          </p>
        </div>

        <FixedBottomAction
          primaryAction={{
            label: isLoading ? "Enviando..." : "Continuar",
            onClick: handleNext,
            disabled: !canContinuePhone || isLoading
          }}
        />
      </div>
    )
  }

  // Step 5: Password creation
  if (currentStep === "password") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Crie sua senha"
            onBack={handleBack}
          />

          <div className="form-input-with-subtitle">
            <AuthFormField
              type="password"
              value={password}
              onChange={setPassword}
              placeholder=""
              required
            />

            <div className="text-sm text-gray-600">
              Deve ter no mínimo 8 dígitos, com letras e números.
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-700 text-center">
                {error}
              </div>
            )}
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: isLoading ? "Criando conta..." : "Continuar",
            onClick: handleNext,
            disabled: !canContinuePassword || isLoading
          }}
        />
      </div>
    )
  }

  // Step 4: Phone verification
  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title={`Enviamos o código para ${phoneNumber}`}
          onBack={handleBack}
        />

        <div className="space-y-6">
          <CodeInput
            length={6}
            value={phoneVerificationCode}
            onChange={setPhoneVerificationCode}
          />

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-700 text-center">
              {error}
            </div>
          )}
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: isLoading ? "Verificando..." : "Continuar",
          onClick: handleNext,
          disabled: !canContinuePhoneVerification || isLoading
        }}
        secondaryAction={canResend ? {
          label: isLoading ? "Reenviando..." : "Reenviar código",
          onClick: handleResendCode
        } : {
          label: `Reenviar em ${formatTime(countdown)}`,
          onClick: () => {}, // Empty function when disabled
          className: "outline-secondary-button opacity-50 cursor-not-allowed"
        }}
      />
    </div>
  )
}
