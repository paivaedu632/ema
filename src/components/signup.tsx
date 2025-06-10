"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { AuthFormField } from "@/components/ui/form-field"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { CodeInput } from "@/components/ui/code-input"
import { PhoneInput } from "@/components/ui/phone-input"

type Step = "email" | "email-verification" | "phone" | "phone-verification" | "password"

export function Signup() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [emailVerificationCode, setEmailVerificationCode] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("+244") // Full phone number with country code
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("")
  const [password, setPassword] = useState("")
  const [countdown, setCountdown] = useState(119) // 1:59 in seconds
  const [canResend, setCanResend] = useState(false)

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
      router.back()
    }
  }

  const handleNext = () => {
    if (currentStep === "email") {
      // Move to email verification step
      setCurrentStep("email-verification")
      setCountdown(119) // Reset countdown
      setCanResend(false)
    } else if (currentStep === "email-verification") {
      // Move to phone step
      setCurrentStep("phone")
    } else if (currentStep === "phone") {
      // Move to phone verification step
      setCurrentStep("phone-verification")
      setCountdown(119) // Reset countdown
      setCanResend(false)
    } else if (currentStep === "phone-verification") {
      // Move to password step
      setCurrentStep("password")
    } else {
      // Handle password creation and complete signup
      console.log("Password:", password)
      console.log("Phone verification code:", phoneVerificationCode)
      console.log("Phone number:", phoneNumber)
      console.log("Email:", email)
      // For now, just navigate to dashboard
      router.push("/dashboard")
    }
  }

  const handleResendCode = () => {
    if (canResend) {
      // Handle resend logic here
      if (currentStep === "email-verification") {
        console.log("Resending email code to:", email)
      } else if (currentStep === "phone-verification") {
        console.log("Resending SMS code to:", phoneNumber)
      }
      setCountdown(119) // Reset countdown
      setCanResend(false)
    }
  }

  // Password validation: minimum 8 characters, contains letters and numbers
  const validatePassword = (pwd: string) => {
    return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /\d/.test(pwd)
  }

  const canContinueEmail = email.trim() !== "" && email.includes("@")
  const canContinueEmailVerification = emailVerificationCode.trim().length === 6
  const canContinuePhone = phoneNumber.trim().length >= 9 // Basic phone validation
  const canContinuePhoneVerification = phoneVerificationCode.trim().length === 6
  const canContinuePassword = validatePassword(password)

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
            label: "Continuar",
            onClick: handleNext,
            disabled: !canContinueEmail
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
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleNext,
            disabled: !canContinueEmailVerification
          }}
          secondaryAction={canResend ? {
            label: "Reenviar código",
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

            {/* Login Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Já tem conta?{" "}
                <button
                  className="text-black underline font-medium"
                  onClick={() => router.push("/login")}
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
            label: "Continuar",
            onClick: handleNext,
            disabled: !canContinuePhone
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
          </div>
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleNext,
            disabled: !canContinuePassword
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
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Continuar",
          onClick: handleNext,
          disabled: !canContinuePhoneVerification
        }}
        secondaryAction={canResend ? {
          label: "Reenviar código",
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
