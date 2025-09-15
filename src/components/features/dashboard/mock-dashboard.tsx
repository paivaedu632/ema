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
  BarChart3,
  Users,
  DollarSign,
  Activity
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

export default function MockDashboard() {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">EmaPay</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {user.kycStatus === 'verified' ? '✓ Verified' : 'Pending verification'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your money today.
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Total Balance</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              >
                {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                {isBalanceVisible ? formatCurrency(totalBalance, 'EUR') : '••••••'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {walletBalances.map((wallet) => (
                  <div key={wallet.currency} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {wallet.currency}
                      </span>
                      <div className="flex items-center space-x-1">
                        {wallet.changePercent > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${
                          wallet.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {wallet.changePercent > 0 ? '+' : ''}{wallet.changePercent}%
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      {isBalanceVisible ? formatCurrency(wallet.available, wallet.currency) : '••••••'}
                    </div>
                    {wallet.reserved > 0 && (
                      <div className="text-xs text-gray-500">
                        Reserved: {isBalanceVisible ? formatCurrency(wallet.reserved, wallet.currency) : '••••'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium">€2,450 sent</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Transactions</span>
                <span className="text-sm font-medium">47 completed</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg. Transfer</span>
                <span className="text-sm font-medium">€52.13</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">All systems operational</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={`h-20 flex-col space-y-2 ${action.color} text-white border-0 hover:opacity-90`}
              onClick={() => router.push(action.href)}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€12,450</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€8,230</div>
              <p className="text-xs text-muted-foreground">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,350</div>
              <p className="text-xs text-muted-foreground">
                +180 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <p className="text-xs text-muted-foreground">
                +0.3% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/transactions')}>
                  <History className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'receive' || transaction.type === 'deposit'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${
                        transaction.type === 'receive' || transaction.type === 'deposit'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {formatTransactionAmount(transaction)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Chart visualization would go here</p>
                  <p className="text-sm text-gray-400">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
