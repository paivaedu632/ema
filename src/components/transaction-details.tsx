"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { RefreshCw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { ConfirmationSection, ConfirmationRow } from "@/components/ui/confirmation-section"
import { getTransactionById, formatTransactionForDisplay, getTransactionStatusInfo, type EnhancedTransactionData } from "@/lib/transaction-api"
import { DateUtils } from "@/utils/formatting-utils"

interface TransactionDetailsProps {
  transactionId: string
}

export function TransactionDetails({ transactionId }: TransactionDetailsProps) {
  const router = useRouter()
  const [transaction, setTransaction] = useState<EnhancedTransactionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTransaction() {
      try {
        setLoading(true)
        setError(null)

        // Remove # prefix if present for backward compatibility
        const cleanId = transactionId.startsWith('#') ? transactionId.slice(1) : transactionId

        const data = await getTransactionById(cleanId)
        if (!data) {
          setError('Transação não encontrada')
          return
        }

        setTransaction(data)
      } catch (err) {
        console.error('Error fetching transaction:', err)
        setError('Erro ao carregar transação')
      } finally {
        setLoading(false)
      }
    }

    if (transactionId) {
      fetchTransaction()
    }
  }, [transactionId])

  const handleBack = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Carregando detalhes da transação...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Transação não encontrada"
            onBack={handleBack}
          />
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{error || 'Transação não encontrada'}</p>
            <Button onClick={handleBack} className="primary-button">
              Voltar ao Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const formattedTransaction = formatTransactionForDisplay(transaction)
  const statusInfo = getTransactionStatusInfo(transaction.status)

  // Get transaction type title
  const getTransactionTitle = (type: string) => {
    switch (type) {
      case 'buy': return 'Compra de moeda'
      case 'sell': return 'Venda de moeda'
      case 'send': return 'Transferência enviada'
      case 'receive': return 'Transferência recebida'
      case 'deposit': return 'Depósito'
      case 'withdraw': return 'Saque'
      default: return 'Transação'
    }
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title={getTransactionTitle(transaction.type)}
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Status and Date */}
          <div className="flex items-center gap-3">
            {transaction.status === 'completed' && (
              <Check className="w-5 h-5 text-green-600" />
            )}
            <span className="text-green-600 font-medium">{statusInfo.label}</span>
            <span className="text-gray-500">
              {DateUtils.format(new Date(transaction.created_at), 'dd/mm/yyyy')}
            </span>
          </div>

          {/* Transaction Details */}
          <ConfirmationSection title="">
            {/* Buy Transaction */}
            {transaction.type === 'buy' && (
              <>
                <ConfirmationRow label="Valor enviado" value={formattedTransaction.sentAmount || `${transaction.amount} ${transaction.currency}`} />
                <ConfirmationRow label="Taxa EmaPay" value={formattedTransaction.fee || `${transaction.fee_amount} ${transaction.currency}`} />
                {formattedTransaction.exchangeRate && (
                  <ConfirmationRow label="Taxa de câmbio" value={formattedTransaction.exchangeRate} />
                )}
                <ConfirmationRow label="Valor recebido" value={formattedTransaction.receivedAmount || `${transaction.metadata?.aoa_amount?.toLocaleString('pt-AO')} Kz`} highlight />
              </>
            )}

            {/* Sell Transaction */}
            {transaction.type === 'sell' && (
              <>
                <ConfirmationRow label="Valor vendido" value={formattedTransaction.sentAmount || `${transaction.amount} ${transaction.currency}`} />
                <ConfirmationRow label="Taxa EmaPay" value={formattedTransaction.fee || `${transaction.fee_amount} ${transaction.currency}`} />
                {formattedTransaction.exchangeRate && (
                  <ConfirmationRow label="Taxa de câmbio" value={formattedTransaction.exchangeRate} />
                )}
                <ConfirmationRow label="Valor recebido" value={formattedTransaction.receivedAmount || `${transaction.metadata?.eur_amount?.toLocaleString('pt-PT')} €`} highlight />
              </>
            )}

            {/* Send Transaction */}
            {transaction.type === 'send' && (
              <>
                <ConfirmationRow label="Valor enviado" value={formattedTransaction.sentAmount || `${transaction.amount} ${transaction.currency}`} />
                <ConfirmationRow label="Taxa EmaPay" value={formattedTransaction.fee || `${transaction.fee_amount} ${transaction.currency}`} />
                <ConfirmationRow label="Valor líquido" value={formattedTransaction.receivedAmount || `${transaction.net_amount} ${transaction.currency}`} highlight />
              </>
            )}

            {/* Receive Transaction */}
            {transaction.type === 'receive' && (
              <ConfirmationRow label="Valor recebido" value={formattedTransaction.receivedAmount || `${transaction.amount} ${transaction.currency}`} highlight />
            )}

            {/* Deposit Transaction */}
            {transaction.type === 'deposit' && (
              <>
                <ConfirmationRow label="Valor depositado" value={formattedTransaction.receivedAmount || `${transaction.amount} ${transaction.currency}`} />
                {transaction.fee_amount > 0 && (
                  <ConfirmationRow label="Taxa" value={formattedTransaction.fee || `${transaction.fee_amount} ${transaction.currency}`} />
                )}
              </>
            )}

            {/* Withdraw Transaction */}
            {transaction.type === 'withdraw' && (
              <>
                <ConfirmationRow label="Valor sacado" value={formattedTransaction.sentAmount || `${transaction.amount} ${transaction.currency}`} />
                {transaction.fee_amount > 0 && (
                  <ConfirmationRow label="Taxa" value={formattedTransaction.fee || `${transaction.fee_amount} ${transaction.currency}`} />
                )}
              </>
            )}

            <ConfirmationRow label="Número da transação" value={transaction.display_id} />
          </ConfirmationSection>

          {/* Recipient Details (for send transactions) */}
          {transaction.type === 'send' && transaction.recipient_info && (
            <ConfirmationSection title="Destinatário">
              {transaction.recipient_info.name && (
                <ConfirmationRow label="Nome" value={transaction.recipient_info.name} />
              )}
              {transaction.recipient_info.email && (
                <ConfirmationRow label="Email" value={transaction.recipient_info.email} />
              )}
              {transaction.recipient_info.phone && (
                <ConfirmationRow label="Telefone" value={transaction.recipient_info.phone} />
              )}
            </ConfirmationSection>
          )}

          {/* Counterparty Info (for exchanges) */}
          {transaction.counterparty_user && (
            <ConfirmationSection title={transaction.type === 'buy' ? 'Vendedor' : 'Comprador'}>
              <ConfirmationRow
                label="Nome"
                value={transaction.counterparty_user.full_name || 'Usuário EmaPay'}
              />
              <ConfirmationRow label="Email" value={transaction.counterparty_user.email} />
            </ConfirmationSection>
          )}

          {/* Additional Information */}
          {(transaction.metadata?.order_matching || transaction.metadata?.fee_percentage || transaction.reference_id) && (
            <ConfirmationSection title="Informações adicionais">
              {transaction.metadata?.order_matching && (
                <ConfirmationRow label="Correspondência de pedidos" value="Ativada" />
              )}
              {transaction.metadata?.fee_percentage && (
                <ConfirmationRow
                  label="Taxa percentual"
                  value={`${(transaction.metadata.fee_percentage * 100).toFixed(2)}%`}
                />
              )}
              {transaction.reference_id && (
                <ConfirmationRow label="ID de referência" value={transaction.reference_id} />
              )}
            </ConfirmationSection>
          )}
        </div>
      </main>
    </div>
  )
}
