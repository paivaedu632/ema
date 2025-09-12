'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Bell,
  HelpCircle,
  Grid3X3,
  Home,
  Coins,
  ArrowUpDown,
  Compass,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  ChevronDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CryptoAsset {
  id: string
  name: string
  symbol: string
  balance: number
  balanceUSD: number
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  icon: string
  color: string
}

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'buy' | 'sell' | 'convert'
  asset: string
  amount: number
  amountUSD: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  description: string
}

export default function CoinbaseStyleDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('conta')

  // Mock user data
  const user = {
    name: 'Eduardo Paiva',
    email: 'paivaedu.br@gmail.com',
    avatar: null,
    initials: 'E'
  }

  // Mock crypto assets (adapted for EmaPay - EUR/AOA focus)
  const assets: CryptoAsset[] = [
    {
      id: 'eur',
      name: 'Euro',
      symbol: 'EUR',
      balance: 2847.50,
      balanceUSD: 2847.50,
      currentPrice: 1.0,
      priceChange: 0.02,
      priceChangePercent: 2.1,
      icon: '€',
      color: 'bg-blue-500'
    },
    {
      id: 'aoa',
      name: 'Angolan Kwanza',
      symbol: 'AOA',
      balance: 1250000,
      balanceUSD: 1923.08, // ~650 AOA = 1 USD
      currentPrice: 0.00154,
      priceChange: -0.00007,
      priceChangePercent: -4.35,
      icon: 'Kz',
      color: 'bg-red-500'
    }
  ]

  // Mock transactions
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'receive',
      asset: 'EUR',
      amount: 500,
      amountUSD: 500,
      date: '2024-01-15T10:30:00Z',
      status: 'completed',
      description: 'Received from Maria Silva'
    },
    {
      id: '2',
      type: 'send',
      asset: 'AOA',
      amount: 150000,
      amountUSD: 230.77,
      date: '2024-01-14T16:45:00Z',
      status: 'completed',
      description: 'Sent to João Santos'
    },
    {
      id: '3',
      type: 'convert',
      asset: 'EUR',
      amount: 300,
      amountUSD: 300,
      date: '2024-01-14T09:15:00Z',
      status: 'pending',
      description: 'EUR → AOA Exchange'
    }
  ]

  const sidebarItems = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" />, active: false },
    { id: 'conta', label: 'Conta', icon: <Coins className="h-5 w-5" />, active: true },
    { id: 'transactions', label: 'Transactions', icon: <ArrowUpDown className="h-5 w-5" />, active: false },
    { id: 'explore', label: 'Explore', icon: <Compass className="h-5 w-5" />, active: false },
    { id: 'more', label: 'More', icon: <MoreHorizontal className="h-5 w-5" />, active: false }
  ]

  const quickActions = [
    { id: 'send', label: 'Send crypto', icon: <ArrowUpRight className="h-5 w-5" />, color: 'bg-blue-500' },
    { id: 'receive', label: 'Receive crypto', icon: <ArrowDownLeft className="h-5 w-5" />, color: 'bg-blue-500' },
    { id: 'deposit', label: 'Deposit cash', icon: <Plus className="h-5 w-5" />, color: 'bg-blue-500' },
    { id: 'withdraw', label: 'Withdraw cash', icon: <Minus className="h-5 w-5" />, color: 'bg-blue-500' }
  ]

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send': return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'receive': return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case 'buy': return <Plus className="h-4 w-4 text-green-500" />
      case 'sell': return <Minus className="h-4 w-4 text-red-500" />
      case 'convert': return <ArrowUpDown className="h-4 w-4 text-blue-500" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-xl font-semibold">EmaPay</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    item.active 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Language Selector */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <span>English</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Conta</h1>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  1
                </span>
              </Button>

              {/* Help */}
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-5 w-5" />
              </Button>

              {/* Apps */}
              <Button variant="ghost" size="sm">
                <Grid3X3 className="h-5 w-5" />
              </Button>

              {/* Profile */}
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Quick Actions */}
            <div className="mb-8">
              <div className="grid grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${action.color} text-white`}>
                          {action.icon}
                        </div>
                        <span className="font-medium text-gray-900">{action.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Balance</div>
                  <div className="col-span-3">Current price</div>
                  <div className="col-span-2"></div>
                </div>
              </div>

              {/* Assets List */}
              <div className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <div key={asset.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Asset Name */}
                      <div className="col-span-4 flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${asset.color} flex items-center justify-center text-white font-bold`}>
                          {asset.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{asset.name}</div>
                          <div className="text-sm text-gray-500">
                            {asset.balance === 0 ? '0%' : '100%'} staked
                          </div>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(asset.balance, asset.symbol)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asset.balance} {asset.symbol}
                        </div>
                      </div>

                      {/* Current Price */}
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(asset.balanceUSD, 'USD')}
                        </div>
                        <div className={`text-sm flex items-center space-x-1 ${
                          asset.priceChangePercent > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {asset.priceChangePercent > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{Math.abs(asset.priceChangePercent)}%</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions Section */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Transactions</h2>
              
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-full">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{transaction.description}</div>
                              <div className="text-sm text-gray-500">{formatDate(transaction.date)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(transaction.amount, transaction.asset)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(transaction.amountUSD, 'USD')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-6">
              <a href="#" className="hover:text-gray-700">Careers</a>
              <a href="#" className="hover:text-gray-700">Legal & Privacy</a>
              <a href="#" className="hover:text-gray-700">Accessibility Statement</a>
            </div>
            <div>© 2025 EmaPay</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
