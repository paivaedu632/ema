'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react'

export default function TransactionsPage() {
  const router = useRouter()

  // Extended mock data for all transactions
  const allTransactions = [
    { id: '155034567', description: 'Google Services', amount: '+ 100 AOA', date: 'Today, 4:32pm', type: 'received', status: 'completed' },
    { id: '155034568', description: 'Ai Builder Club', amount: '25.90 USD', date: 'Today', type: 'purchase', status: 'declined' },
    { id: '155034569', description: 'Ai Builder Club', amount: '25.90 USD', date: 'Yesterday', type: 'purchase', status: 'declined' },
    { id: '155034570', description: 'Netflix Subscription', amount: '- 15.99 EUR', date: 'Yesterday, 2:15pm', type: 'purchase', status: 'completed' },
    { id: '155034571', description: 'Transfer to João', amount: '- 50 AOA', date: '2 days ago', type: 'sent', status: 'completed' },
    { id: '155034572', description: 'Salary Payment', amount: '+ 1500 EUR', date: '3 days ago', type: 'received', status: 'completed' },
    { id: '155034573', description: 'Spotify Premium', amount: '- 9.99 EUR', date: '1 week ago', type: 'purchase', status: 'completed' },
    { id: '155034574', description: 'Transfer from Maria', amount: '+ 75 AOA', date: '1 week ago', type: 'received', status: 'completed' },
  ]

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

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Transações"
          onBack={() => router.push('/dashboard')}
        />

        {/* All Transactions */}
        <div className="space-y-4">
          {allTransactions.map((transaction) => (
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
                  {transaction.status === 'declined' && (
                    <span className="text-red-600">Declined · </span>
                  )}
                  {transaction.date}
                </p>
              </div>
              
              {/* Transaction Amount */}
              <div className="text-right">
                <p className="value-secondary">{transaction.amount}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
