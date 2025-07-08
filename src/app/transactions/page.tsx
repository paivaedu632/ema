'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { TransactionListItem, TransactionListItemSkeleton, TransactionListEmpty } from '@/components/ui/transaction-list-item'
import { useTransactions } from '@/hooks/use-transactions'

export default function TransactionsPage() {
  const router = useRouter()

  // Use optimized transaction hook with caching
  const {
    transactions,
    loading,
    error,
    refreshTransactions,
    hasMore,
    loadMore
  } = useTransactions({ limit: 20 })

  // Handle refresh action
  const handleRefresh = () => {
    refreshTransactions()
  }

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
