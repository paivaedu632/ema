'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { PrimaryActionButtons } from '@/components/ui/primary-action-buttons'
import { IconActionButtons } from '@/components/ui/icon-action-buttons'
import { EurFlag, AngolaFlag } from '@/components/ui/flag-icon'
import { ChevronRight, ShoppingBag, ArrowUpRight, ArrowDownLeft, CreditCard, RefreshCw } from 'lucide-react'

interface WalletProps {
  currency?: string
  amount?: string
}

export default function Wallet({ currency = 'EUR', amount = '0.00' }: WalletProps) {
  const router = useRouter()

  // Get the appropriate flag component based on currency
  const getFlagComponent = () => {
    switch (currency) {
      case 'AOA':
        return <AngolaFlag />
      case 'EUR':
        return <EurFlag />
      default:
        return <EurFlag />
    }
  }



  // Mock transaction data with standardized icon system
  const transactions = [
    {
      id: '155034567',
      recipient: 'Edgar Agostinho Rodrigues Paiva',
      type: 'sent',
      date: 'May 22',
      amount: '- 40 EUR',
      status: 'completed'
    },
    {
      id: '155034568',
      recipient: 'To your USD balance',
      type: 'convert',
      date: 'May 20',
      amount: '- 116 EUR',
      status: 'completed'
    }
  ]

  // Function to get transaction icon based on type and status (same as dashboard/transactions)
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
      case 'convert':
        return <RefreshCw className="w-5 h-5 text-blue-600" />
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
        <div className="px-4 py-8 text-center">
          {/* Flag and Title */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            {getFlagComponent()}
            <h1 className="text-lg font-medium text-gray-900">Carteira {currency}</h1>
          </div>

          {/* Balance Amount */}
          <div className="mb-6">
            <p className="text-4xl font-bold text-black">{amount} {currency}</p>
          </div>


        </div>

        {/* Action Buttons */}
        <div className="px-4 mb-8">
          {/* Primary Action Buttons */}
          <PrimaryActionButtons className="mb-8" />

          {/* Icon-Based Action Buttons */}
          <IconActionButtons />
        </div>

        {/* Transactions Section */}
        <div className="px-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="heading-section">Transações</h2>
          </div>

          <div className="space-y-4">
            {transactions.map((transaction) => (
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
                  <p className="value-secondary">{transaction.recipient}</p>
                  <p className="label-form">
                    {transaction.status === 'declined' && (
                      <span className="text-red-600">Declined · </span>
                    )}
                    {transaction.type === 'sent' ? 'Sent' : transaction.type === 'convert' ? 'Convert' : transaction.type} • {transaction.date}
                  </p>
                </div>

                {/* Transaction Amount */}
                <div className="text-right">
                  <p className="value-secondary">{transaction.amount}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
