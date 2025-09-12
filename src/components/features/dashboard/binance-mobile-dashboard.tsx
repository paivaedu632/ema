'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  Bell,
  User,
  Settings,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ArrowLeftRight,
  MoreHorizontal,
  ChevronDown,
  Menu,
  X,
  Home,
  Wallet,
  BarChart3,
  Gift,
  Users,
  CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function BinanceMobileDashboard() {
  const router = useRouter()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState('Total')

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

  const menuItems = [
    { icon: <Home className="h-5 w-5" />, label: 'Dashboard', active: true },
    { icon: <Wallet className="h-5 w-5" />, label: 'Assets' },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Orders' },
    { icon: <Gift className="h-5 w-5" />, label: 'Rewards Hub' },
    { icon: <Users className="h-5 w-5" />, label: 'Referral' },
    { icon: <User className="h-5 w-5" />, label: 'Account' },
    { icon: <CreditCard className="h-5 w-5" />, label: 'Sub Accounts' },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Menu and Logo */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-yellow-400 rounded flex items-center justify-center">
                  <span className="text-black font-bold text-xs">E</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">EmaPay</h1>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-yellow-400 rounded flex items-center justify-center">
                    <span className="text-black font-bold text-xs">E</span>
                  </div>
                  <h2 className="font-bold text-gray-900">EmaPay</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left ${
                    item.active 
                      ? 'bg-yellow-50 text-yellow-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="px-4 py-6 space-y-6">
        {/* Balance Section */}
        <Card className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg font-medium">Estimated Balance</CardTitle>
                <button className="flex items-center space-x-1">
                  <span className="text-sm">{selectedAsset}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-black hover:bg-black/10"
              >
                {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {isBalanceVisible ? `$${totalUSDValue.toFixed(2)}` : '••••••••'}
            </div>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              <span>≈ $0.00</span>
              <div className="flex items-center space-x-1">
                <span>Today&apos;s PnL</span>
                <span className={`font-medium ${todaysPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ≈ ${todaysPnL >= 0 ? '+' : ''}${todaysPnL.toFixed(2)} ({todaysPnL >= 0 ? '+' : ''}0.00%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-black h-16 flex-col space-y-1">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Deposit</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col space-y-1">
            <ArrowUpRight className="h-5 w-5" />
            <span className="text-xs">Withdraw</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col space-y-1">
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-xs">Transfer</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col space-y-1">
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-xs">Convert</span>
          </Button>
        </div>

        {/* Assets Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Assets</CardTitle>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {walletBalances.map((wallet) => (
                <div key={wallet.currency} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{wallet.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium">{wallet.currency}</div>
                      <div className="text-sm text-gray-500">
                        {isBalanceVisible ? formatCurrency(wallet.available, wallet.currency) : '••••••'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {isBalanceVisible ? `$${wallet.usdValue.toFixed(2)}` : '••••••'}
                    </div>
                    <div className={`text-sm ${
                      wallet.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {wallet.changePercent > 0 ? '+' : ''}{wallet.changePercent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600">
                More
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{transaction.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-medium text-sm">
                        {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No records</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
