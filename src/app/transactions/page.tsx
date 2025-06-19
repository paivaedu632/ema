'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react'

interface Transaction {
  id: string
  description: string
  amount: string
  date: string
  type: string
  status: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real transaction data
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/wallet/transactions')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Transform API data to component format
            const formattedTransactions = result.data.map((tx: any) => ({
              id: tx.id,
              description: getTransactionDescription(tx.type, tx.recipient_info),
              amount: formatAmount(tx.amount, tx.currency, tx.type),
              date: formatDate(tx.created_at),
              type: tx.type,
              status: tx.status
            }))
            setTransactions(formattedTransactions)
          } else {
            // Fallback to sample data if no transactions
            setTransactions([
              { id: 'sample-1', description: 'Bem-vindo ao EmaPay', amount: '+ 0 EUR', date: 'Hoje', type: 'received', status: 'completed' }
            ])
          }
        } else {
          throw new Error('Failed to fetch transactions')
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
        setError('Erro ao carregar transações')
        // Fallback to sample data on error
        setTransactions([
          { id: 'sample-1', description: 'Bem-vindo ao EmaPay', amount: '+ 0 EUR', date: 'Hoje', type: 'received', status: 'completed' }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  // Helper functions
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
      default:
        return 'Transação'
    }
  }

  const formatAmount = (amount: number, currency: string, type: string) => {
    const sign = ['buy', 'deposit'].includes(type) ? '+ ' : '- '
    return `${sign}${amount.toFixed(2)} ${currency}`
  }

  const formatDate = (dateString: string) => {
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
    if (status === 'declined') {
      return <ShoppingBag className="w-5 h-5 text-gray-600" />
    }
    
    switch (type) {
      case 'received':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />
      case 'sent':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-gray-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Transações"
            onBack={() => router.push('/dashboard')}
          />
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <span className="ml-3 text-gray-600">Carregando transações...</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Transações"
          onBack={() => router.push('/dashboard')}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* All Transactions */}
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma transação encontrada</p>
              <p className="text-gray-400 text-sm mt-1">Suas transações aparecerão aqui</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => router.push(`/transaction/${transaction.id}`)}
                className="w-full flex items-center py-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {/* Transaction Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                  {getTransactionIcon(transaction.type, transaction.status)}
                </div>

                {/* Transaction Details */}
                <div className="flex-1 text-left">
                  <p className="value-secondary">{transaction.description}</p>
                  <p className="label-form">
                    {transaction.status === 'failed' && (
                      <span className="text-red-600">Falhou · </span>
                    )}
                    {transaction.date}
                  </p>
                </div>

                {/* Transaction Amount */}
                <div className="text-right">
                  <p className="value-secondary">{transaction.amount}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
