'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  User,
  Settings,
  HelpCircle,
  Globe,
  Moon,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Gift,
  Users,
  BarChart3
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function BinanceStyleDashboard() {
  const router = useRouter()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState('EUR')

  // Mock user data
  const user = {
    name: 'Eduardo Paiva',
    email: 'paivaedu.br@gmail.com',
    isVip: false,
    kycLevel: 'Verified'
  }

  // Mock wallet balances with crypto-style data
  const walletBalances = [
    {
      currency: 'EUR',
      symbol: 'EUR',
      available: 2847.50,
      locked: 152.25,
      total: 2999.75,
      usdValue: 3299.73,
      change24h: 45.30,
      changePercent: 1.53,
      icon: '€'
    },
    {
      currency: 'AOA',
      symbol: 'AOA',
      available: 1250000,
      locked: 75000,
      total: 1325000,
      usdValue: 2038.46,
      changePercent: -2.1,
      change24h: -28500,
      icon: 'Kz'
    },
    {
      currency: 'BTC',
      symbol: 'BTC',
      available: 0.00000001,
      locked: 0,
      total: 0.00000001,
      usdValue: 0.00,
      changePercent: 0,
      change24h: 0,
      icon: '₿'
    }
  ]

  const totalUSDValue = walletBalances.reduce((sum, wallet) => sum + wallet.usdValue, 0)
  const todaysPnL = walletBalances.reduce((sum, wallet) => sum + (wallet.change24h * (wallet.currency === 'EUR' ? 1.1 : wallet.currency === 'AOA' ? 0.00154 : 43000)), 0)

  // Mock recent transactions
  const recentTransactions = [
    {
      id: '1',
      type: 'deposit' as const,
      status: 'completed' as const,
      amount: 500,
      currency: 'EUR',
      description: 'Bank Deposit',
      date: '2024-01-15T10:30:00Z',
      txHash: '0x1234...5678'
    },
    {
      id: '2',
      type: 'send' as const,
      status: 'completed' as const,
      amount: 150000,
      currency: 'AOA',
      description: 'Transfer to João Santos',
      date: '2024-01-14T16:45:00Z',
      txHash: '0x2345...6789'
    },
    {
      id: '3',
      type: 'exchange' as const,
      status: 'pending' as const,
      amount: 300,
      currency: 'EUR',
      description: 'EUR/AOA Exchange',
      date: '2024-01-14T09:15:00Z',
      txHash: '0x3456...7890'
    }
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case 'send': return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'exchange': return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Binance Style */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-yellow-400 rounded flex items-center justify-center">
                  <span className="text-black font-bold text-sm">E</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">EmaPay</h1>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <button className="text-gray-900 font-medium">Dashboard</button>
                <button className="text-gray-500 hover:text-gray-900">Assets</button>
                <button className="text-gray-500 hover:text-gray-900">Orders</button>
                <button className="text-gray-500 hover:text-gray-900">Rewards Hub</button>
                <button className="text-gray-500 hover:text-gray-900">Referral</button>
              </nav>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-4">
              <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium">
                Deposit
              </Button>
              <Button variant="ghost" size="sm">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Globe className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Moon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-gray-900">Dashboard</span>
            </div>
            
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5" />
                  <span>Assets</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5" />
                  <span>Orders</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Gift className="h-5 w-5" />
                  <span>Rewards Hub</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5" />
                  <span>Referral</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5" />
                  <span>Sub Accounts</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Balance Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Estimated Balance</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-4xl font-bold text-gray-900">
                    {isBalanceVisible ? `${formatCurrency(totalUSDValue, 'USD')}` : '••••••••'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  >
                    {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">≈ $0.00</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-500">Today&apos;s PnL</span>
                    <span className={`text-sm font-medium ${todaysPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ≈ ${todaysPnL >= 0 ? '+' : ''}${todaysPnL.toFixed(2)} ({todaysPnL >= 0 ? '+' : ''}0.00%)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  Deposit
                </Button>
                <Button variant="outline">
                  Withdraw
                </Button>
                <Button variant="outline">
                  Transfer
                </Button>
              </div>
            </div>
          </div>

          {/* Assets Table */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Assets</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Asset</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Total Balance</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Available Balance</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">In Order</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">USD Value</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletBalances.map((wallet) => (
                      <tr key={wallet.currency} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">{wallet.icon}</span>
                            </div>
                            <div>
                              <div className="font-medium">{wallet.currency}</div>
                              <div className="text-sm text-gray-500">{wallet.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="font-medium">
                            {isBalanceVisible ? formatCurrency(wallet.total, wallet.currency) : '••••••'}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="font-medium">
                            {isBalanceVisible ? formatCurrency(wallet.available, wallet.currency) : '••••••'}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="font-medium">
                            {isBalanceVisible ? formatCurrency(wallet.locked, wallet.currency) : '••••••'}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="font-medium">
                            {isBalanceVisible ? `$${wallet.usdValue.toFixed(2)}` : '••••••'}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="ghost" className="text-yellow-600 hover:text-yellow-700">
                              Deposit
                            </Button>
                            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-700">
                              Withdraw
                            </Button>
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700">
                              Trade
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  More →
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.txHash}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">
                          {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No records</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
