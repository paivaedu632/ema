'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PrimaryActionButtons } from '@/components/ui/primary-action-buttons'
import { IconActionButtons } from '@/components/ui/icon-action-buttons'
import { BalanceCard } from '@/components/ui/balance-card'
import { AngolaFlag, EurFlag } from '@/components/ui/flag-icon'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard, LogOut, AlertCircle } from 'lucide-react'
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/nextjs'
import { ClerkAuth } from '@/components/auth/clerk-auth'

// KYC Status Types
type KYCStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected'

interface KYCStatusInfo {
  status: KYCStatus
  currentStep: number
  totalSteps: number
  completionPercentage: number
}

export default function Dashboard() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [kycStatus, setKycStatus] = useState<KYCStatusInfo | null>(null)
  const [showKycBanner, setShowKycBanner] = useState(true)

  // Mock KYC status - In real implementation, fetch from API
  useEffect(() => {
    // Simulate fetching KYC status
    const mockKycStatus: KYCStatusInfo = {
      status: 'not_started',
      currentStep: 1,
      totalSteps: 16,
      completionPercentage: 0
    }
    setKycStatus(mockKycStatus)
  }, [])

  const handleCardClick = (account: typeof accounts[0]) => {
    const params = new URLSearchParams({
      currency: account.currency,
      type: account.type,
      amount: account.amount
    })
    router.push(`/wallet?${params.toString()}`)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      // Handle sign out error silently
    }
  }

  const handleStartKYC = () => {
    router.push('/kyc/notifications')
  }



  // Mock data for account balances (matching reference design)
  const accounts = [
    {
      type: 'Conta',
      currency: 'AOA',
      amount: '100',
      flag: <AngolaFlag />
    },
    {
      type: 'Reservado',
      currency: 'AOA',
      amount: '100',
      flag: <AngolaFlag />
    },
    {
      type: 'Conta',
      currency: 'EUR',
      amount: '50',
      flag: <EurFlag />
    },
    {
      type: 'Reservado',
      currency: 'EUR',
      amount: '25',
      flag: <EurFlag />
    },
  ]

  // Mock data for transactions (matching reference design)
  const transactions = [
    { id: '155034567', description: 'Google Services', amount: '+ 100 AOA', date: 'Today, 4:32pm', type: 'received', status: 'completed' },
    { id: '155034568', description: 'Ai Builder Club', amount: '25.90 USD', date: 'Today', type: 'purchase', status: 'declined' },
    { id: '155034569', description: 'Ai Builder Club', amount: '25.90 USD', date: 'Yesterday', type: 'purchase', status: 'declined' },
  ]

  // Function to get transaction icon based on type and status
  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'declined') {
      return <ShoppingBag className="w-5 h-5 text-gray-600" />
    }

    switch (type) {
      case 'received':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />
      case 'sent':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-gray-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to EmaPay</h1>
            <p className="text-gray-600">Please sign in to access your dashboard</p>
            <ClerkAuth />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <main className="max-w-sm mx-auto px-4 pt-8 pb-6">
        {/* Header with Profile Avatar and Sign Out */}
        <div className="flex justify-between items-center mb-8">
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-12 h-12"
                }
              }}
            />
          </SignedIn>
          <SignedOut>
            <Avatar className="w-12 h-12">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </SignedOut>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* KYC Status Banner - Clickable Card with Clear CTA */}
        {showKycBanner && kycStatus && kycStatus.status !== 'approved' && (
          <div
            className="mb-6 bg-rose-50 rounded-2xl p-4 cursor-pointer hover:bg-rose-100 transition-colors"
            onClick={handleStartKYC}
          >
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="heading-small mb-1">
                  {kycStatus.status === 'not_started' && 'Complete sua verificação'}
                  {kycStatus.status === 'in_progress' && 'Continue sua verificação'}
                  {kycStatus.status === 'pending_review' && 'Verificação em análise'}
                  {kycStatus.status === 'rejected' && 'Verificação rejeitada'}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {kycStatus.status === 'not_started' && 'Verifique sua identidade para usar todos os recursos do EmaPay.'}
                  {kycStatus.status === 'in_progress' && `Você completou ${kycStatus.currentStep} de ${kycStatus.totalSteps} etapas.`}
                  {kycStatus.status === 'pending_review' && 'Seus documentos estão sendo analisados. Você receberá uma notificação em breve.'}
                  {kycStatus.status === 'rejected' && 'Alguns documentos precisam ser reenviados. Clique para continuar.'}
                </p>
                {kycStatus.status === 'in_progress' && (
                  <div className="w-full bg-rose-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-black h-2 rounded-full transition-all duration-300"
                      style={{ width: `${kycStatus.completionPercentage}%` }}
                    ></div>
                  </div>
                )}
                {(kycStatus.status === 'not_started' || kycStatus.status === 'in_progress' || kycStatus.status === 'rejected') && (
                  <p className="text-sm font-medium text-black">
                    {kycStatus.status === 'not_started' && 'Toque para iniciar verificação →'}
                    {kycStatus.status === 'in_progress' && 'Toque para continuar verificação →'}
                    {kycStatus.status === 'rejected' && 'Toque para corrigir documentos →'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Cards Section */}
        <div className="mb-8">
          <h2 className="heading-section mb-4">Saldo</h2>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {accounts.map((account, index) => (
              <BalanceCard
                key={index}
                type={account.type}
                currency={account.currency}
                amount={account.amount}
                flag={account.flag}
                onClick={() => handleCardClick(account)}
              />
            ))}
          </div>

          {/* Primary Action Buttons */}
          <PrimaryActionButtons className="mt-6 mb-8" />

          {/* Icon-Based Action Buttons */}
          <IconActionButtons className="mb-8" />
        </div>

        {/* Transactions Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="heading-section">Transações</h2>
            <button
              className="small-action-button"
              onClick={() => router.push('/transactions')}
            >
              Ver mais
            </button>
          </div>

          <div className="space-y-4">
            {transactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => router.push(`/transaction/${transaction.id}`)}
                className="w-full transaction-list-item"
              >
                {/* Transaction Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                  {getTransactionIcon(transaction.type, transaction.status)}
                </div>

                {/* Transaction Details */}
                <div className="flex-1 text-left">
                  <p className="value-secondary">{transaction.description}</p>
                  <p className="label-form">
                    {transaction.status === 'declined' && (
                      <span className="text-red-600">Declined · </span>
                    )}
                    {transaction.date}
                  </p>
                </div>

                {/* Transaction Amount */}
                <div className="text-right">
                  <p className="value-secondary">{transaction.amount}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        </main>
      </SignedIn>
    </div>
  )
}
