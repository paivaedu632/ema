'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  Search,
  Settings,
  Moon,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  Wallet,
  BarChart3,
  MoreHorizontal
} from 'lucide-react'
import { formatCurrency, formatAmountOnly, type Currency } from '@/lib/utils'
import { FlagIcon } from '@/components/ui/flag-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useAuth } from '@/hooks/use-auth'
import { useWallets, useTransactions } from '@/hooks/use-api'
import { ExchangeRateChart } from './exchange-rate-chart'

export default function Home() {
  const router = useRouter()
  const { user: authUser, logout } = useAuth()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Fetch real financial data from backend APIs - only when user is authenticated
  const { data: apiWalletBalances, isLoading: walletsLoading, error: walletsError } = useWallets(!!authUser)
  const { data: apiTransactions, isLoading: transactionsLoading, error: transactionsError } = useTransactions(!!authUser)

  // Mock user data (fallback if auth user not available)
  const user = authUser || {
    emailAddresses: [{ emailAddress: 'paivaedu.br@gmail.com' }]
  }

  // Transform API data to match component expectations, with fallback to mock data
  const walletBalances = apiWalletBalances?.map(wallet => ({
    currency: wallet.currency,
    symbol: wallet.currency,
    available: wallet.available,
    locked: wallet.pending, // Map 'pending' to 'locked' for UI consistency
    total: wallet.total,
    usdValue: wallet.currency === 'EUR' ? wallet.total * 1.1 : wallet.total * 0.00154, // Approximate USD conversion
    change24h: 0, // TODO: Add 24h change data to API
    changePercent: 0, // TODO: Add percentage change data to API
    icon: wallet.currency
  })) || [
    // Fallback mock data when API is loading or fails
    {
      currency: 'EUR',
      symbol: 'EUR',
      available: 2999.75,
      locked: 2847.50,
      total: 5847.25,
      usdValue: 6432.00,
      change24h: 0,
      changePercent: 0,
      icon: 'EUR'
    },
    {
      currency: 'AOA',
      symbol: 'AOA',
      available: 1325000.00,
      locked: 1250000.00,
      total: 2575000.00,
      usdValue: 3961.54,
      changePercent: 0,
      change24h: 0,
      icon: 'AOA'
    }
  ]

  const totalUSDValue = walletBalances.reduce((sum, wallet) => sum + wallet.usdValue, 0)
  // Convert USD to EUR (using approximate rate of 1 USD = 0.92 EUR)
  const totalEURValue = totalUSDValue * 0.92
  const todaysPnL = walletBalances.reduce((sum, wallet) => sum + (wallet.change24h * (wallet.currency === 'EUR' ? 1.1 : wallet.currency === 'AOA' ? 0.00154 : 43000)), 0)

  // Transform API transaction data to match component expectations, with fallback to mock data
  const recentTransactions = apiTransactions?.slice(0, 3).map(transaction => ({
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    description: transaction.description || `${transaction.type === 'send' ? 'Enviado' : transaction.type === 'receive' ? 'Recebido' : transaction.type === 'deposit' ? 'Depósito' : transaction.type === 'withdraw' ? 'Retirada' : 'Troca'} ${transaction.currency}`,
    date: transaction.createdAt,
    txHash: transaction.displayId || transaction.id
  })) || [
    // Fallback mock data when API is loading or fails
    {
      id: '1',
      type: 'deposit' as const,
      status: 'completed' as const,
      amount: 500,
      currency: 'EUR',
      description: 'Depósito Bancário',
      date: '2024-01-15T10:30:00Z',
      txHash: '0x1234...5678'
    },
    {
      id: '2',
      type: 'send' as const,
      status: 'completed' as const,
      amount: 150000.00,
      currency: 'AOA',
      description: 'Transferência para João Santos',
      date: '2024-01-14T16:45:00Z',
      txHash: '0x2345...6789'
    },
    {
      id: '3',
      type: 'exchange' as const,
      status: 'pending' as const,
      amount: 300,
      currency: 'EUR',
      description: 'Conversão EUR/AOA',
      date: '2024-01-14T09:15:00Z',
      txHash: '0x3456...7890'
    }
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-gray-900" />
      case 'send': return <ArrowUpRight className="h-4 w-4 text-gray-900" />
      case 'exchange': return <ArrowLeftRight className="h-4 w-4 text-gray-900" />
      default: return <MoreHorizontal className="h-4 w-4 text-gray-900" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 text-xs">Concluído</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pendente</Badge>
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Falhado</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Mobile Header - Show only on mobile */}
      <div className="lg:hidden">
        <AppHeader user={user} onSignOut={logout} className="px-4 pt-2 pb-0" />
      </div>



      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-white z-50 pt-16">
            {/* Logo Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">EmaPay</h1>
              </div>
            </div>

            <nav className="p-4 space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Início</span>
              </div>

              <div className="space-y-1">
                <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-5 w-5" />
                    <span>Carteiras</span>
                  </div>
                </button>

                <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5" />
                    <span>Transações</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/convert')}
                  className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ArrowLeftRight className="h-5 w-5" />
                    <span>Convert-1</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/convert-2')}
                  className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ArrowLeftRight className="h-5 w-5" />
                    <span>Convert-2</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/convert-3')}
                  className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ArrowLeftRight className="h-5 w-5" />
                    <span>Convert-3</span>
                  </div>
                </button>

                <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Search className="h-5 w-5" />
                    <span>Pesquisar</span>
                  </div>
                </button>

                <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Moon className="h-5 w-5" />
                    <span>Modo Escuro</span>
                  </div>
                </button>

                <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-5 w-5" />
                    <span>Configurações</span>
                  </div>
                </button>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="flex">
        <aside className="hidden lg:block w-64 bg-white min-h-screen">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">EmaPay</h1>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Início</span>
            </div>

            <div className="space-y-1">
              <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5" />
                  <span>Carteiras</span>
                </div>
              </button>

              <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5" />
                  <span>Transações</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/convert')}
                className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>Convert-1</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/convert-2')}
                className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>Convert-2</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/convert-3')}
                className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>Convert-3</span>
                </div>
              </button>

              <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Search className="h-5 w-5" />
                  <span>Pesquisar</span>
                </div>
              </button>

              <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Moon className="h-5 w-5" />
                  <span>Modo Escuro</span>
                </div>
              </button>

              <button className="w-full flex items-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 md:p-6 pb-20 lg:pb-6">
          {/* Balance Section - Card Style */}
          <Card className="bg-white border border-gray-200 mb-4 md:mb-8">
            <CardContent className="p-4 md:p-6">
              {/* Balance Section Header */}
              <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Saldo</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {isBalanceVisible ? <EyeOff className="h-3 w-3 text-gray-600" /> : <Eye className="h-3 w-3 text-gray-600" />}
                </Button>
              </div>

              {/* Balance Amount and Action Buttons Layout */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Balance Amount */}
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {walletsLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : isBalanceVisible ? (
                    formatCurrency(totalEURValue, 'EUR')
                  ) : (
                    '••••••••'
                  )}
                </div>

                {/* Action Buttons - Desktop: Side by side, Mobile: Horizontal row left-aligned */}
                <div className="flex gap-3 lg:gap-4 lg:flex-shrink-0">
                  <button
                    onClick={() => router.push('/deposit')}
                    className="flex flex-col items-center space-y-1 lg:space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[60px] lg:min-w-[80px]"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
                      <Plus className="w-5 h-5 text-gray-900" />
                    </div>
                    <span className="text-sm text-gray-900 font-medium text-center leading-tight">
                      Depositar
                    </span>
                  </button>
                  <button
                    onClick={() => router.push('/convert')}
                    className="flex flex-col items-center space-y-1 lg:space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[60px] lg:min-w-[80px]"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
                      <ArrowLeftRight className="w-5 h-5 text-gray-900" />
                    </div>
                    <span className="text-sm text-gray-900 font-medium text-center leading-tight">
                      Converter
                    </span>
                  </button>
                  <button
                    onClick={() => router.push('/send')}
                    className="flex flex-col items-center space-y-1 lg:space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[60px] lg:min-w-[80px]"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
                      <ArrowUp className="w-5 h-5 text-gray-900" />
                    </div>
                    <span className="text-sm text-gray-900 font-medium text-center leading-tight">
                      Transferir
                    </span>
                  </button>
                  <button
                    onClick={() => router.push('/withdraw')}
                    className="flex flex-col items-center space-y-1 lg:space-y-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[60px] lg:min-w-[80px]"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
                      <ArrowDown className="w-5 h-5 text-gray-900" />
                    </div>
                    <span className="text-sm text-gray-900 font-medium text-center leading-tight">
                      Retirar
                    </span>
                  </button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Wallets and Transactions - Vertical Layout */}
          <div className="space-y-4 md:space-y-8">
            {/* Wallets Section - New Design */}
            <Card className="bg-white border border-gray-200 w-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg md:text-xl font-semibold text-gray-900">Contas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {walletsLoading ? (
                    // Loading skeletons for wallet cards
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-12 mb-1" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-5 w-20 mb-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-12 mb-1" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-5 w-20 mb-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </>
                  ) : null}
                  {!walletsLoading && walletBalances.map((wallet) => (
                    <div key={wallet.currency} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                          <FlagIcon
                            countryCode={wallet.currency === 'EUR' ? 'eu' : 'ao'}
                            size="lg"
                            alt={`${wallet.currency} flag`}
                            className="w-10 h-10 object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{wallet.currency}</div>
                          <div className="text-sm text-gray-900">Reservado</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 text-lg">
                          {isBalanceVisible ? formatAmountOnly(wallet.available, wallet.currency as Currency) : '••••••'}
                        </div>
                        <div className="text-sm text-gray-900">
                          {isBalanceVisible ? formatAmountOnly(wallet.locked, wallet.currency as Currency) : '••••••'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions - New Design */}
            <Card className="bg-white border border-gray-200 w-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl font-semibold text-gray-900">Transações</CardTitle>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 text-sm">
                    See all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {transactionsLoading ? (
                    // Loading skeletons for transactions
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-28 mb-1" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-18" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-18 mb-1" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                      </div>
                    </>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-base">
                              {transaction.description}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.type === 'deposit' ? 'Sent' : transaction.type === 'send' ? 'Received' : 'Moved'} • Yesterday
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 text-base">
                            {transaction.type === 'deposit' ? '+' : transaction.type === 'send' ? '-' : ''} {formatCurrency(transaction.amount, transaction.currency as Currency)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma transação encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Exchange Rate Chart - Moved to Bottom */}
            <ExchangeRateChart className="mt-4 md:mt-8" />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Show only on mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
