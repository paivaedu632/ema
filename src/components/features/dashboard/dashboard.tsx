'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  Send,
  Download,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  MoreHorizontal,
  Bell,
  Settings,
  LogOut,
  Wallet,
  ArrowLeftRight,
  History,
  PieChart,
  BarChart3
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Mock data interfaces
interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available: number
  reserved: number
  total: number
  change24h: number
  changePercent: number
}

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'exchange' | 'deposit' | 'withdrawal'
  status: 'completed' | 'pending' | 'failed'
  amount: number
  currency: 'EUR' | 'AOA'
  description: string
  recipient?: string
  date: string
  fee?: number
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  color: string
}




export default function Dashboard() {
  const router = useRouter()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('7d')

  // Mock user data
  const user = {
    name: 'Eduardo Paiva',
    email: 'paivaedu.br@gmail.com',
    avatar: null,
    initials: 'EP',
    kycStatus: 'verified',
    memberSince: '2024'
  }

  // Mock wallet balances with realistic data
  const walletBalances: WalletBalance[] = [
    {
      currency: 'EUR',
      available: 2847.50,
      reserved: 152.25,
      total: 2999.75,
      change24h: 45.30,
      changePercent: 1.53
    },
    {
      currency: 'AOA',
      available: 1250000,
      reserved: 75000,
      total: 1325000,
      changePercent: -2.1,
      change24h: -28500
    }
  ]

  const totalBalance = walletBalances.reduce((sum, wallet) => {
    // Convert AOA to EUR for total (mock exchange rate: 1 EUR = 650 AOA)
    const eurValue = wallet.currency === 'EUR' ? wallet.total : wallet.total / 650
    return sum + eurValue
  }, 0)

  const formatTransactionAmount = (transaction: Transaction) => {
    const sign = transaction.type === 'receive' || transaction.type === 'deposit' ? '+' : '-'
    return `${sign}${formatCurrency(transaction.amount, transaction.currency)}`
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send': return <ArrowUpRight className="h-4 w-4" />
      case 'receive': return <ArrowDownLeft className="h-4 w-4" />
      case 'exchange': return <ArrowLeftRight className="h-4 w-4" />
      case 'deposit': return <Plus className="h-4 w-4" />
      case 'withdrawal': return <CreditCard className="h-4 w-4" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Mock recent transactions
  const recentTransactions: Transaction[] = [
    {
      id: '1',
      type: 'receive',
      status: 'completed',
      amount: 500,
      currency: 'EUR',
      description: 'Received from Maria Silva',
      recipient: 'Maria Silva',
      date: '2024-01-15T10:30:00Z',
      fee: 2.50
    },
    {
      id: '2',
      type: 'send',
      status: 'completed',
      amount: 150000,
      currency: 'AOA',
      description: 'Sent to João Santos',
      recipient: 'João Santos',
      date: '2024-01-14T16:45:00Z',
      fee: 1500
    },
    {
      id: '3',
      type: 'exchange',
      status: 'completed',
      amount: 300,
      currency: 'EUR',
      description: 'EUR → AOA Exchange',
      date: '2024-01-14T09:15:00Z',
      fee: 3.00
    },
    {
      id: '4',
      type: 'deposit',
      status: 'pending',
      amount: 1000,
      currency: 'EUR',
      description: 'Bank deposit via IBAN',
      date: '2024-01-13T14:20:00Z',
      fee: 5.00
    },
    {
      id: '5',
      type: 'send',
      status: 'failed',
      amount: 75,
      currency: 'EUR',
      description: 'Failed transfer to Ana Costa',
      recipient: 'Ana Costa',
      date: '2024-01-12T11:10:00Z'
    }
  ]

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'send',
      label: 'Send Money',
      icon: <Send className="h-5 w-5" />,
      href: '/transfers/send',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'receive',
      label: 'Request Money',
      icon: <Download className="h-5 w-5" />,
      href: '/transfers/receive',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'exchange',
      label: 'Exchange',
      icon: <ArrowLeftRight className="h-5 w-5" />,
      href: '/trading/exchange',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'deposit',
      label: 'Add Money',
      icon: <Plus className="h-5 w-5" />,
      href: '/wallet/deposit',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]



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
