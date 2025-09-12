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
  Plus,
  Bell,
  Settings,
  Wallet,
  ArrowLeftRight,
  History,
  QrCode,
  CreditCard,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function MobileDashboard() {
  const router = useRouter()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)

  // Mock user data
  const user = {
    name: 'Eduardo Paiva',
    email: 'paivaedu.br@gmail.com',
    avatar: null,
    initials: 'EP',
    kycStatus: 'verified'
  }

  // Mock wallet balances
  const walletBalances = [
    {
      currency: 'EUR' as const,
      available: 2847.50,
      reserved: 152.25,
      total: 2999.75,
      changePercent: 1.53
    },
    {
      currency: 'AOA' as const,
      available: 1250000,
      reserved: 75000,
      total: 1325000,
      changePercent: -2.1
    }
  ]

  // Mock recent transactions
  const recentTransactions = [
    {
      id: '1',
      type: 'receive' as const,
      status: 'completed' as const,
      amount: 500,
      currency: 'EUR' as const,
      description: 'From Maria Silva',
      date: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      type: 'send' as const,
      status: 'completed' as const,
      amount: 150000,
      currency: 'AOA' as const,
      description: 'To João Santos',
      date: '2024-01-14T16:45:00Z'
    },
    {
      id: '3',
      type: 'exchange' as const,
      status: 'pending' as const,
      amount: 300,
      currency: 'EUR' as const,
      description: 'EUR → AOA Exchange',
      date: '2024-01-14T09:15:00Z'
    }
  ]

  const quickActions = [
    {
      id: 'send',
      label: 'Send',
      icon: <Send className="h-6 w-6" />,
      color: 'bg-blue-500'
    },
    {
      id: 'receive',
      label: 'Receive',
      icon: <QrCode className="h-6 w-6" />,
      color: 'bg-green-500'
    },
    {
      id: 'exchange',
      label: 'Exchange',
      icon: <ArrowLeftRight className="h-6 w-6" />,
      color: 'bg-purple-500'
    },
    {
      id: 'deposit',
      label: 'Add Money',
      icon: <Plus className="h-6 w-6" />,
      color: 'bg-orange-500'
    }
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send': return <ArrowUpRight className="h-4 w-4" />
      case 'receive': return <ArrowDownLeft className="h-4 w-4" />
      case 'exchange': return <ArrowLeftRight className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
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

  const formatTransactionAmount = (transaction: any) => {
    const sign = transaction.type === 'receive' ? '+' : '-'
    return `${sign}${formatCurrency(transaction.amount, transaction.currency)}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Hello, {user.name.split(' ')[0]}
                </h1>
                <p className="text-sm text-gray-500">Welcome back</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Total Balance</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-white hover:bg-white/20"
              >
                {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">
              {isBalanceVisible ? '€4,037.50' : '••••••'}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {walletBalances.map((wallet) => (
                <div key={wallet.currency} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">{wallet.currency}</span>
                    <div className="flex items-center space-x-1">
                      {wallet.changePercent > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-xs">
                        {wallet.changePercent > 0 ? '+' : ''}{wallet.changePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">
                    {isBalanceVisible ? formatCurrency(wallet.available, wallet.currency) : '••••••'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="flex flex-col items-center space-y-2 p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className={`p-3 rounded-full ${action.color} text-white`}>
                {action.icon}
              </div>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <History className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'receive' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`font-semibold text-sm ${
                      transaction.type === 'receive' ? 'text-green-600' : 'text-gray-900'
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sent this month</p>
                  <p className="text-lg font-bold">€2,450</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Received this month</p>
                  <p className="text-lg font-bold">€1,830</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
