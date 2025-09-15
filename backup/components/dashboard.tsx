'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
// Clerk removed - using Supabase Auth
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UnifiedActionButtons } from '@/components/ui/unified-action-buttons'
import { ConsolidatedBalanceCard } from '@/components/ui/balance-card'
import { LogOut, Eye, EyeOff } from 'lucide-react'
import { TransactionListItem, TransactionListItemSkeleton, TransactionListEmpty } from '@/components/ui/transaction-list-item'
import LoadingAnimation from '@/components/ui/loading-animation'

// Interface for display-ready transaction data
interface DisplayTransaction {
  id: string
  displayId?: string
  type: string
  status: string
  description: string
  amount: string
  currency: string
  date: string
}




export default function Dashboard() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  // Static wallet balances for visual representation
  const [balancesLoading] = useState(false)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [walletBalances] = useState([
    {
      currency: 'EUR',
      available_balance: 1250.75,
      reserved_balance: 0.00
    },
    {
      currency: 'AOA',
      available_balance: 485000.00,
      reserved_balance: 15000.00
    }
  ])



  // TODO: Add useEffect here to fetch real wallet balances when clean architecture APIs are implemented



  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch {
      // Handle sign out error silently
    }
  }

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible)
  }



  // Legacy code - keeping for reference but no longer used with consolidated balance card
  // const handleCardClick = (account: typeof accounts[0]) => {
  //   const params = new URLSearchParams({
  //     currency: account.currency,
  //     type: account.type,
  //     amount: account.amount
  //   })
  //   router.push(`/wallet?${params.toString()}`)
  // }

  // Generate account cards from real wallet balances - 4 cards total (2 per currency)
  // const accounts = walletBalances.flatMap((wallet) => [
  //   {
  //     type: 'Conta',
  //     currency: wallet.currency,
  //     amount: (wallet.available_balance || 0).toFixed(2),
  //     flag: wallet.currency === 'AOA' ? <AngolaFlag /> : <EurFlag />
  //   },
  //   {
  //     type: 'Reservado',
  //     currency: wallet.currency,
  //     amount: (wallet.reserved_balance || 0).toFixed(2),
  //     flag: wallet.currency === 'AOA' ? <AngolaFlag /> : <EurFlag />
  //   }
  // ])

  // Static transactions for visual representation
  const dashboardTransactions: DisplayTransaction[] = []
  const mockTransactionsLoading = false

  return (
    <div className="min-h-screen bg-white">
      {!isLoaded || !user ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingAnimation size="lg" />
        </div>
      ) : (
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-section">Saldo</h2>
            <button
              onClick={toggleBalanceVisibility}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
              title="Toggle balance visibility"
            >
              {isBalanceVisible ? (
                <Eye className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <div className="px-1">
            {balancesLoading ? (
              // Loading skeleton for consolidated balance card
              <div className="w-full h-48 bg-gray-100 rounded-2xl animate-pulse border-2 border-gray-300" />
            ) : (
              <ConsolidatedBalanceCard
                walletBalances={walletBalances}
                onClick={() => router.push('/wallet')}
                isBalanceVisible={isBalanceVisible}
              />
            )}
          </div>

          {/* Unified Action Buttons */}
          <UnifiedActionButtons className="mt-6 mb-8" />
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
            {mockTransactionsLoading ? (
              // Loading skeleton for transactions
              <>
                {[1, 2, 3].map((i) => (
                  <TransactionListItemSkeleton key={i} />
                ))}
              </>
            ) : dashboardTransactions.length > 0 ? (
              dashboardTransactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  id={transaction.id}
                  displayId={transaction.displayId}
                  type={transaction.type}
                  status={transaction.status}
                  description={transaction.description}
                  amount={transaction.amount}
                  currency={transaction.currency || 'EUR'}
                  date={transaction.date}
                  onClick={(id) => router.push(`/transaction/${id}`)}
                />
              ))
            ) : (
              <TransactionListEmpty title="Nenhuma transação encontrada" />
            )}
          </div>
        </div>
        </main>
      )}
    </div>
  )
}
