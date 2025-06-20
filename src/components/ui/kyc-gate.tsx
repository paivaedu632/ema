"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Shield, ArrowRight } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

interface KYCGateProps {
  children: React.ReactNode
  requiredForAction: string // e.g., "send money", "buy currency", "withdraw funds"
  transactionAmount?: number
  transactionCurrency?: string
  className?: string
}

interface KYCLimits {
  dailyLimit: number
  monthlyLimit: number
  transactionLimit: number
  currency: string
}

interface UserLimits {
  current: KYCLimits
  afterKYC: KYCLimits
  kycStatus: 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected'
}

/**
 * KYC Gate Component
 * 
 * Wraps transaction components and shows KYC requirement modal when:
 * - User attempts transaction above pre-KYC limits
 * - User has not completed KYC verification
 * - Specific actions require enhanced verification
 * 
 * Provides smooth UX by allowing users to see transaction forms
 * but gating actual execution behind KYC completion
 */
export function KYCGate({ 
  children, 
  requiredForAction, 
  transactionAmount = 0, 
  transactionCurrency = 'EUR',
  className = "" 
}: KYCGateProps) {
  const router = useRouter()
  const { user } = useUser()
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null)

  // Fetch real user limits from API
  useEffect(() => {
    const fetchUserLimits = async () => {
      try {
        const response = await fetch('/api/user/limits')
        if (response.ok) {
          const result = await response.json()
          const limits: UserLimits = {
            current: {
              dailyLimit: result.data.current_limits.daily_limit,
              monthlyLimit: result.data.current_limits.monthly_limit,
              transactionLimit: result.data.current_limits.transaction_limit,
              currency: result.data.current_limits.currency
            },
            afterKYC: {
              dailyLimit: result.data.kyc_limits.daily_limit,
              monthlyLimit: result.data.kyc_limits.monthly_limit,
              transactionLimit: result.data.kyc_limits.transaction_limit,
              currency: result.data.kyc_limits.currency
            },
            kycStatus: result.data.kyc_status
          }
          setUserLimits(limits)
        } else {
          // Fallback to default limits if API fails
          setUserLimits({
            current: {
              dailyLimit: 100,
              monthlyLimit: 500,
              transactionLimit: 100,
              currency: 'EUR'
            },
            afterKYC: {
              dailyLimit: 10000,
              monthlyLimit: 50000,
              transactionLimit: 5000,
              currency: 'EUR'
            },
            kycStatus: 'not_started'
          })
        }
      } catch (error) {
        // Fallback to default limits if API fails
        setUserLimits({
          current: {
            dailyLimit: 100,
            monthlyLimit: 500,
            transactionLimit: 100,
            currency: 'EUR'
          },
          afterKYC: {
            dailyLimit: 10000,
            monthlyLimit: 50000,
            transactionLimit: 5000,
            currency: 'EUR'
          },
          kycStatus: 'not_started'
        })
      }
    }

    fetchUserLimits()
  }, [])

  // Check if transaction requires KYC
  const requiresKYC = () => {
    if (!userLimits) return false
    
    // Always require KYC for certain actions
    const alwaysRequireKYC = ['withdraw funds', 'send to external account']
    if (alwaysRequireKYC.includes(requiredForAction.toLowerCase())) {
      return userLimits.kycStatus !== 'approved'
    }

    // Check transaction amount limits
    if (transactionAmount > userLimits.current.transactionLimit) {
      return userLimits.kycStatus !== 'approved'
    }

    return false
  }

  const handleStartKYC = () => {
    router.push('/kyc/notifications')
  }

  const handleContinueWithoutKYC = () => {
    setShowKYCModal(false)
  }

  // Trigger KYC modal when component mounts if KYC is required
  useEffect(() => {
    if (requiresKYC()) {
      setShowKYCModal(true)
    }
  }, [userLimits, transactionAmount])

  if (!userLimits) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-32"></div>
  }

  return (
    <div className={className}>
      {children}
      
      {/* KYC Requirement Modal - EmaPay Theme */}
      {showKYCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-700" />
              </div>

              {/* Title */}
              <h2 className="heading-step mb-2">
                Verificação necessária
              </h2>

              {/* Message */}
              <p className="text-sm text-gray-600 mb-6">
                Para {requiredForAction.toLowerCase()}, você precisa completar a verificação de identidade.
                {transactionAmount > 0 && (
                  <>
                    <br /><br />
                    <strong>Valor solicitado:</strong> {transactionAmount.toFixed(2)} {transactionCurrency}
                    <br />
                    <strong>Limite atual:</strong> {userLimits.current.transactionLimit.toFixed(2)} {userLimits.current.currency}
                  </>
                )}
              </p>

              {/* Benefits */}
              <div className="bg-gray-100 rounded-2xl p-4 mb-6">
                <h3 className="heading-small mb-2">
                  Após a verificação você poderá:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Transações até €{userLimits.afterKYC.transactionLimit.toLocaleString()}</li>
                  <li>• Limite diário de €{userLimits.afterKYC.dailyLimit.toLocaleString()}</li>
                  <li>• Limite mensal de €{userLimits.afterKYC.monthlyLimit.toLocaleString()}</li>
                  <li>• Acesso a todos os recursos do EmaPay</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleStartKYC}
                  className="primary-action-button flex items-center justify-center space-x-2"
                >
                  <span>Iniciar verificação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {transactionAmount <= userLimits.current.transactionLimit && (
                  <button
                    onClick={handleContinueWithoutKYC}
                    className="w-full text-gray-600 py-2 px-4 text-sm hover:text-gray-800 transition-colors"
                  >
                    Continuar sem verificação
                  </button>
                )}
              </div>

              {/* Time estimate */}
              <p className="text-xs text-gray-500 mt-4">
                ⏱️ Verificação completa em ~10 minutos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to check KYC requirements for transactions
 */
export function useKYCCheck() {
  const [kycStatus, setKycStatus] = useState<'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected'>('not_started')
  const [limits, setLimits] = useState({
    transactionLimit: 100,
    dailyLimit: 500,
    monthlyLimit: 2000
  })

  // Fetch real limits from API
  React.useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch('/api/user/limits')
        if (response.ok) {
          const result = await response.json()
          setKycStatus(result.data.kyc_status)
          setLimits({
            transactionLimit: result.data.current_limits.transaction_limit,
            dailyLimit: result.data.current_limits.daily_limit,
            monthlyLimit: result.data.current_limits.monthly_limit
          })
        }
      } catch (error) {
        console.error('Error fetching limits for KYC check:', error)
      }
    }

    fetchLimits()
  }, [])

  const checkKYCRequired = (action: string, amount?: number) => {
    if (kycStatus === 'approved') return false

    const alwaysRequireKYC = ['withdraw', 'send_external']
    if (alwaysRequireKYC.includes(action)) return true

    if (amount && amount > limits.transactionLimit) return true

    return false
  }

  const triggerKYC = () => {
    // Navigate to KYC flow
    window.location.href = '/kyc/notifications'
  }

  return {
    kycStatus,
    checkKYCRequired,
    triggerKYC
  }
}

/**
 * Higher-order component to wrap transaction components with KYC gate
 */
export function withKYCGate<T extends object>(
  Component: React.ComponentType<T>,
  requiredForAction: string
) {
  return function KYCGatedComponent(props: T & { transactionAmount?: number; transactionCurrency?: string }) {
    const { transactionAmount, transactionCurrency, ...componentProps } = props
    
    return (
      <KYCGate 
        requiredForAction={requiredForAction}
        transactionAmount={transactionAmount}
        transactionCurrency={transactionCurrency}
      >
        <Component {...(componentProps as T)} />
      </KYCGate>
    )
  }
}
