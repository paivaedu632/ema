'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Download,
  HelpCircle,
  MessageSquare,
  Type,
  Globe,
  Sun,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Wallet,
  BarChart3,
  Gift,
  Users,
  User,
  Settings
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BalanceData {
  currency: string
  symbol: string
  balance: number
  usdValue: number
  change24h: number
  changePercent: number
  todaysPnL: number
  todaysPnLPercent: number
}

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'buy' | 'sell' | 'transfer'
  asset: string
  amount: number
  status: 'completed' | 'pending' | 'failed'
  date: string
  description: string
}

export default function BinanceStyleDashboard() {
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState('BTC')

  // Mock balance data (adapted for EmaPay)
  const balanceData: BalanceData = {
    currency: 'Bitcoin',
    symbol: 'BTC',
    balance: 0.00000001,
    usdValue: 0.00,
    change24h: 0.00,
    changePercent: 0.00,
    todaysPnL: 0.00,
    todaysPnLPercent: 0.00
  }

  // For EmaPay, we'll show EUR/AOA balances
  const emapayBalances = [
    {
      currency: 'Euro',
      symbol: 'EUR',
      balance: 2847.50,
      usdValue: 2847.50,
      change24h: 45.30,
      changePercent: 1.61,
      todaysPnL: 45.30,
      todaysPnLPercent: 1.61
    },
    {
      currency: 'Angolan Kwanza',
      symbol: 'AOA',
      balance: 1250000,
      usdValue: 1923.08,
      change24h: -28500,
      changePercent: -2.23,
      todaysPnL: -43.85,
      todaysPnLPercent: -2.23
    }
  ]

  const currentBalance = selectedAsset === 'EUR' 
    ? emapayBalances[0] 
    : selectedAsset === 'AOA' 
    ? emapayBalances[1] 
    : balanceData

  // Mock transactions
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'deposit',
      asset: 'EUR',
      amount: 500,
      status: 'completed',
      date: '2024-01-15T10:30:00Z',
      description: 'Bank deposit'
    },
    {
      id: '2',
      type: 'transfer',
      asset: 'AOA',
      amount: 150000,
      status: 'completed',
      date: '2024-01-14T16:45:00Z',
      description: 'Transfer to João Santos'
    }
  ]

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, active: true },
    { id: 'assets', label: 'Assets', icon: <Wallet className="h-5 w-5" />, active: false, hasSubmenu: true },
    { id: 'orders', label: 'Orders', icon: <MoreHorizontal className="h-5 w-5" />, active: false, hasSubmenu: true },
    { id: 'rewards', label: 'Rewards Hub', icon: <Gift className="h-5 w-5" />, active: false },
    { id: 'referral', label: 'Referral', icon: <Users className="h-5 w-5" />, active: false },
    { id: 'account', label: 'Account', icon: <User className="h-5 w-5" />, active: false, hasSubmenu: true },
    { id: 'subaccounts', label: 'Sub Accounts', icon: <Users className="h-5 w-5" />, active: false },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, active: false }
  ]

  const quickActions = [
    { id: 'deposit', label: 'Deposit', variant: 'default' as const },
    { id: 'withdraw', label: 'Withdraw', variant: 'outline' as const },
    { id: 'transfer', label: 'Transfer', variant: 'outline' as const }
  ]

  const formatBalance = (balance: number, symbol: string) => {
    if (symbol === 'BTC') {
      return balance.toFixed(8)
    }
    return balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'withdraw': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'transfer': return <MoreHorizontal className="h-4 w-4 text-blue-500" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">EMAPAY</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    item.active 
                      ? 'bg-yellow-50 text-yellow-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.hasSubmenu && (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">EmaPay© 2025</p>
          <button className="text-xs text-gray-500 hover:text-gray-700 mt-1">
            Cookie Preferences
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - empty for Binance style */}
            <div></div>
            
            {/* Right side - actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search"
                  className="pl-10 w-64 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Deposit button */}
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
                <Download className="h-4 w-4 mr-2" />
                Deposit
              </Button>

              {/* Icon buttons */}
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Type className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Globe className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Sun className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Balance Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-semibold text-gray-900">Estimated Balance</h1>
                  <Info className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* Asset selector */}
                <div className="flex items-center space-x-2">
                  <select 
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="BTC">BTC</option>
                    <option value="EUR">EUR</option>
                    <option value="AOA">AOA</option>
                  </select>
                </div>
              </div>

              {/* Balance Display */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatBalance(currentBalance.balance, currentBalance.symbol)}
                      </span>
                      <span className="text-lg text-gray-500">{currentBalance.symbol}</span>
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>≈ ${currentBalance.usdValue.toFixed(2)}</span>
                      <span>
                        Today's PnL ≈ 
                        <span className={`ml-1 ${currentBalance.todaysPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${currentBalance.todaysPnL.toFixed(2)} ({currentBalance.todaysPnLPercent >= 0 ? '+' : ''}{currentBalance.todaysPnLPercent.toFixed(4)}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-3">
                    {quickActions.map((action) => (
                      <Button key={action.id} variant={action.variant} size="sm">
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  More →
                </Button>
              </div>

              <div className="p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No records</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-full">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(transaction.amount, transaction.asset)}
                          </div>
                          <div className={`text-sm ${
                            transaction.status === 'completed' ? 'text-green-600' : 
                            transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {transaction.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
