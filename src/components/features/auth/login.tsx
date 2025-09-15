"use client"

import { useState } from "react"
import { Eye, EyeOff, QrCode } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartEmailPhoneInput } from "@/components/ui/phone-input"
import { useAuth } from "@/hooks/use-auth"
import Link from 'next/link'

export function Login() {
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoggingIn, loginError } = useAuth()

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (emailOrPhone) {
      setStep('password')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailOrPhone && password) {
      // For now, we'll pass emailOrPhone as email to the login function
      // In a real implementation, you'd parse phone numbers vs emails
      await login({ email: emailOrPhone, password })
    }
  }

  const handleBack = () => {
    setStep('email')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-sm space-y-8">
            {/* Logo */}
            <div className="text-left">
              <div className="h-12 w-auto flex items-center">
                <span className="text-2xl font-bold text-gray-900">EmaPay</span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {step === 'email' ? 'Entrar' : 'Digite a Senha'}
                </h1>
                {step === 'email' && (
                  <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <QrCode className="h-4 w-4 mr-1" />
                    Login QR code
                  </button>
                )}
              </div>
            </div>

            {/* Form */}
            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email/Número de telefone
                  </label>
                  <SmartEmailPhoneInput
                    value={emailOrPhone}
                    onChange={(value: string) => setEmailOrPhone(value)}
                    placeholder="Digite seu email ou telefone"
                    className="w-full"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors"
                  disabled={!emailOrPhone}
                >
                  Continuar
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">ou</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continuar com Google</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span>Continuar com Apple</span>
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-gray-600 hover:text-gray-900 mb-4"
                  >
                    ← Voltar ao email
                  </button>
                  <div className="text-sm text-gray-600 mb-4">
                    Entrando como: <span className="font-medium">{emailOrPhone}</span>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full h-12 px-4 pr-12 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="text-red-600 text-sm">
                    {loginError instanceof Error ? loginError.message : String(loginError)}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors"
                  disabled={!password || isLoggingIn}
                >
                  {isLoggingIn ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </form>
            )}

            {/* Footer Link */}
            <div className="text-center">
              <Link
                href="/signup"
                className="text-sm text-black underline hover:text-gray-700"
              >
                Criar uma conta EmaPay
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 px-4 py-6">
        <div className="flex items-center justify-between text-xs text-black">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1">
              <span>🌐</span>
              <span>Português</span>
            </button>
            <button>Cookies</button>
            <Link href="/terms" className="text-black underline hover:text-gray-700">Termos</Link>
            <Link href="/privacy" className="text-black underline hover:text-gray-700">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Login
