'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PrimaryActionButtons } from '@/components/ui/primary-action-buttons'
import { IconActionButtons } from '@/components/ui/icon-action-buttons'
import { BalanceCard } from '@/components/ui/balance-card'
import { AngolaFlag, EurFlag } from '@/components/ui/flag-icon'
import { LogOut } from 'lucide-react'
import { TransactionListEmpty } from '@/components/ui/transaction-list-item'

export default function Dashboard() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleCardClick = (account: any) => {
    const params = new URLSearchParams({
      currency: account.currency,
      type: account.type,
      amount: account.amount
    })
    router.push(`/wallet?${params.toString()}`)
  }

  // Mock wallet balances for testing
  const walletBalances = [
    {
      currency: 'EUR',
      available_balance: 1250.50,
      reserved_balance: 100.00
    },
    {
      currency: 'AOA',
      available_balance: 125000.75,
      reserved_balance: 25000.00
    }
  ]

  // Generate account cards
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Not authenticated</h1>
          <p className="text-gray-600">Please sign in to access your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-sm mx-auto px-4 pt-8 pb-6">
        {/* Header with Profile Avatar and Sign Out */}
        <div className="flex justify-between items-center mb-8">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              {user?.emailAddresses?.[0]?.emailAddress?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5 text-gray-700" />
          </button>
        </div>

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
            <TransactionListEmpty title="Nenhuma transação encontrada" />
          </div>
        </div>
      </main>
    </div>
  )
}
