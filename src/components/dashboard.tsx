'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PrimaryActionButtons } from '@/components/ui/primary-action-buttons'
import { IconActionButtons } from '@/components/ui/icon-action-buttons'
import { BalanceCard } from '@/components/ui/balance-card'
import { AngolaFlag, EurFlag } from '@/components/ui/flag-icon'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard, LogOut } from 'lucide-react'
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
  const [showKycBanner, setShowKycBanner] = useState(false) // Temporarily disabled for testing
  const [loading, setLoading] = useState(true)
  const [walletBalances, setWalletBalances] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)

  // Fetch real KYC status from API
  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const response = await fetch('/api/kyc/status')
        if (response.ok) {
          const result = await response.json()
          setKycStatus({
            status: result.data.status,
            currentStep: result.data.current_step,
            totalSteps: result.data.total_steps,
            completionPercentage: result.data.completion_percentage
          })
        } else {
          console.warn('Failed to fetch KYC status:', response.status)
        }
      } catch (error) {
        console.error('Error fetching KYC status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchKycStatus()
  }, [])

  // Fetch wallet balances and transactions
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        // Fetch wallet balances
        const balancesResponse = await fetch('/api/wallet/balances')
        if (balancesResponse.ok) {
          const balancesResult = await balancesResponse.json()
          setWalletBalances(balancesResult.data || [])
        } else {
          console.error('Failed to fetch wallet balances:', balancesResponse.status)
        }

        // Fetch recent transactions
        const transactionsResponse = await fetch('/api/transactions?limit=3')
        if (transactionsResponse.ok) {
          const transactionsResult = await transactionsResponse.json()
          setTransactions(transactionsResult.data || [])
        }
      } catch (error) {
        console.error('Error fetching wallet data:', error)
      } finally {
        setBalancesLoading(false)
      }
    }

    fetchWalletData()
  }, [])



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

  const handleCardClick = (account: typeof accounts[0]) => {
    const params = new URLSearchParams({
      currency: account.currency,
      type: account.type,
      amount: account.amount
    })
    router.push(`/wallet?${params.toString()}`)
  }



  // Generate account cards from real wallet balances - 4 cards total (2 per currency)
  const accounts = walletBalances.flatMap((wallet) => [
    {
      type: 'Conta',
      currency: wallet.currency,
      amount: (wallet.available_balance || 0).toFixed(2),
      flag: wallet.currency === 'AOA' ? <AngolaFlag /> : <EurFlag />
    },
    {
      type: 'Reservado',
      currency: wallet.currency,
      amount: (wallet.reserved_balance || 0).toFixed(2),
      flag: wallet.currency === 'AOA' ? <AngolaFlag /> : <EurFlag />
    }
  ])

  // Format real transactions for display
  const formatTransactionAmount = (transaction: any) => {
    const sign = transaction.type === 'deposit' || transaction.type === 'receive' ? '+ ' : ''
    return `${sign}${transaction.amount.toFixed(2)} ${transaction.currency}`
  }

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else if (diffDays === 2) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getTransactionDescription = (transaction: any) => {
    if (transaction.metadata?.description) {
      return transaction.metadata.description
    }

    switch (transaction.type) {
      case 'deposit':
        return 'Deposit'
      case 'withdraw':
        return 'Withdrawal'
      case 'send':
        return transaction.recipient_info?.name || 'Transfer Sent'
      case 'receive':
        return 'Transfer Received'
      case 'buy':
        return 'Currency Purchase'
      case 'sell':
        return 'Currency Sale'
      default:
        return 'Transaction'
    }
  }

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

        {/* KYC Status Banner - Temporarily disabled for testing */}
        {/* {showKycBanner && kycStatus && kycStatus.status !== 'approved' && (
          <div
            className="mb-6 bg-rose-50 rounded-2xl p-4 cursor-pointer hover:bg-rose-100 transition-colors"
            onClick={handleStartKYC}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-red-700">
                Complete sua verificação &gt;
              </p>
            </div>
          </div>
        )} */}

        {/* Account Cards Section */}
        <div className="mb-8">
          <h2 className="heading-section mb-4">Saldo</h2>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {balancesLoading ? (
              // Loading skeleton for balance cards
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-shrink-0 w-32 h-20 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </>
            ) : (
              accounts.map((account, index) => (
                <BalanceCard
                  key={index}
                  type={account.type}
                  currency={account.currency}
                  amount={account.amount}
                  flag={account.flag}
                  onClick={() => handleCardClick(account)}
                />
              ))
            )}
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
            {balancesLoading ? (
              // Loading skeleton for transactions
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                  </div>
                ))}
              </>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
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
                  <p className="value-secondary">{getTransactionDescription(transaction)}</p>
                  <p className="label-form">
                    {transaction.status === 'failed' && (
                      <span className="text-red-600">Failed · </span>
                    )}
                    {transaction.status === 'pending' && (
                      <span className="text-yellow-600">Pending · </span>
                    )}
                    {formatTransactionDate(transaction.created_at)}
                  </p>
                </div>

                {/* Transaction Amount */}
                <div className="text-right">
                  <p className="value-secondary">{formatTransactionAmount(transaction)}</p>
                </div>
              </button>
              ))
            ) : (
              // Empty state for transactions
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>
        </div>
        </main>
      </SignedIn>
    </div>
  )
}
