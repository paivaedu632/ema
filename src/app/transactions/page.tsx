'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { TransactionListItem, TransactionListItemSkeleton, TransactionListEmpty } from '@/components/ui/transaction-list-item'

export default function TransactionsPage() {
  const router = useRouter()

  // Static transaction data for visual representation
  const transactions = [
    {
      id: 'tx_001',
      type: 'receive',
      amount: 500,
      currency: 'EUR',
      status: 'completed',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      description: 'Received from John Doe'
    },
    {
      id: 'tx_002',
      type: 'send',
      amount: 150,
      currency: 'EUR',
      status: 'completed',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      description: 'Sent to Maria Silva'
    },
    {
      id: 'tx_003',
      type: 'buy',
      amount: 250,
      currency: 'EUR',
      status: 'pending',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      description: 'Currency exchange'
    }
  ]

  const loading = false
  const error = null
  const hasMore = false

  // TODO: Add real transaction fetching when clean architecture APIs are implemented

  if (loading) {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Transações"
            onBack={() => router.push('/dashboard')}
          />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <TransactionListItemSkeleton key={i} />
            ))}
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
            <TransactionListEmpty />
          ) : (
            <>
              {transactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  id={transaction.id}
                  displayId={transaction.displayId}
                  type={transaction.type}
                  status={transaction.status}
                  description={transaction.description}
                  amount={transaction.amount}
                  date={transaction.date}
                  onClick={(id) => router.push(`/transaction/${id}`)}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    className="small-action-button"
                    disabled={loading}
                  >
                    {loading ? 'Carregando...' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
