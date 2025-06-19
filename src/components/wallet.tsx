'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { PrimaryActionButtons } from '@/components/ui/primary-action-buttons'
import { IconActionButtons } from '@/components/ui/icon-action-buttons'

import { BalanceSelector, type BalanceType, type Currency } from '@/components/ui/balance-selector'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard, RefreshCw } from 'lucide-react'

interface WalletProps {
  currency?: string
  amount?: string
}

interface WalletBalance {
  currency: string
  balance: number
  available_balance: number
  reserved_balance: number
}

export default function Wallet({ currency = 'EUR', amount = '0.00' }: WalletProps) {
  const router = useRouter()
  const [selectedBalanceType, setSelectedBalanceType] = useState<BalanceType>('available')
  const [walletData, setWalletData] = useState<WalletBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  // Fetch wallet data and transactions for the current currency
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        // Fetch wallet balance
        const balanceResponse = await fetch(`/api/wallet/balance/${currency}`)
        if (balanceResponse.ok) {
          const balanceResult = await balanceResponse.json()
          setWalletData(balanceResult.data)
        } else {
          console.warn('Failed to fetch wallet data:', balanceResponse.status)
        }

        // Fetch transactions
        const transactionsResponse = await fetch('/api/transactions?limit=10')
        if (transactionsResponse.ok) {
          const transactionsResult = await transactionsResponse.json()
          setTransactions(transactionsResult.data || [])
        } else {
          console.warn('Failed to fetch transactions:', transactionsResponse.status)
        }
      } catch (error) {
        console.error('Error fetching wallet data:', error)
      } finally {
        setLoading(false)
        setTransactionsLoading(false)
      }
    }

    fetchWalletData()
  }, [currency])

  const handleBalanceTypeChange = (currency: Currency, balanceType: BalanceType) => {
    setSelectedBalanceType(balanceType)
  }

  const getDisplayAmount = (): string => {
    if (!walletData) return amount || '0.00'

    const balance = selectedBalanceType === 'available'
      ? walletData.available_balance
      : walletData.reserved_balance
    return balance.toFixed(2)
  }





  // Helper functions for transaction formatting
  const getTransactionDescription = (type: string, recipientInfo?: any) => {
    switch (type) {
      case 'buy':
        return 'Compra de AOA'
      case 'sell':
        return 'Venda de AOA'
      case 'send':
        return recipientInfo?.name ? `Envio para ${recipientInfo.name}` : 'Envio de dinheiro'
      case 'deposit':
        return 'Depósito'
      case 'withdraw':
        return 'Levantamento'
      case 'receive':
        return 'Recebimento'
      default:
        return 'Transação'
    }
  }

  const formatTransactionAmount = (amount: number, currency: string, type: string) => {
    const sign = ['buy', 'deposit', 'receive'].includes(type) ? '+ ' : '- '
    return `${sign}${amount.toFixed(2)} ${currency}`
  }

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Hoje'
    if (diffDays === 2) return 'Ontem'
    if (diffDays <= 7) return `${diffDays - 1} dias atrás`

    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Function to get transaction icon based on type and status
  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed' || status === 'declined') {
      return <ShoppingBag className="w-5 h-5 text-gray-600" />
    }

    switch (type) {
      case 'receive':
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />
      case 'send':
      case 'withdraw':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />
      case 'buy':
      case 'sell':
        return <ShoppingBag className="w-5 h-5 text-gray-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex justify-start items-center p-4 pt-8">
          <BackButton onClick={handleClose} />
        </div>

        {/* Balance Section */}
        <div className="px-4 py-6 text-center">
          {/* Balance Selector - Replaces static "Carteira {currency}" */}
          <div className="flex items-center justify-center mb-4">
            <BalanceSelector
              currency={currency as Currency}
              balanceType={selectedBalanceType}
              onSelectionChange={handleBalanceTypeChange}
            />
          </div>

          {/* Balance Amount - Reduced spacing */}
          <div className="mb-4">
            {loading ? (
              <div className="h-12 w-48 bg-gray-100 rounded animate-pulse mx-auto"></div>
            ) : (
              <p className="text-4xl font-bold text-black">{getDisplayAmount()} {currency}</p>
            )}
          </div>
        </div>

        {/* Action Buttons - Reduced spacing */}
        <div className="px-4 mb-6">
          {/* Primary Action Buttons */}
          <PrimaryActionButtons className="mb-6" />

          {/* Icon-Based Action Buttons */}
          <IconActionButtons />
        </div>

        {/* Transactions Section */}
        <div className="px-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="heading-section">Transações</h2>
          </div>

          <div className="space-y-4">
            {transactionsLoading ? (
              // Loading skeleton for transactions
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                  </div>
                ))}
              </>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => router.push(`/transaction/${transaction.id}`)}
                  className="w-full flex items-center py-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {/* Transaction Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    {getTransactionIcon(transaction.type, transaction.status)}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 text-left">
                    <p className="value-secondary">{getTransactionDescription(transaction.type, transaction.recipient_info)}</p>
                    <p className="label-form">
                      {transaction.status === 'failed' && (
                        <span className="text-red-600">Falhou · </span>
                      )}
                      {formatTransactionDate(transaction.created_at)}
                    </p>
                  </div>

                  {/* Transaction Amount */}
                  <div className="text-right">
                    <p className="value-secondary">{formatTransactionAmount(transaction.amount, transaction.currency, transaction.type)}</p>
                  </div>
                </button>
              ))
            ) : (
              // Empty state for transactions
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
