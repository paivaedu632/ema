"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SuccessScreen } from "@/components/ui/success-screen"
import { Suspense } from "react"
import { formatCurrency } from "@/lib/utils"

function ConvertSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const exchangeType = searchParams.get('type') || 'auto'
  const executionType = searchParams.get('executionType') || 'legacy'
  const fromCurrency = searchParams.get('fromCurrency') || 'EUR'
  const toCurrency = searchParams.get('toCurrency') || 'AOA'

  // Legacy parameters
  const amount = searchParams.get('amount') || '0'
  const currency = searchParams.get('currency') || 'AOA'

  // Hybrid execution parameters
  const marketExecutedAmount = parseFloat(searchParams.get('marketExecutedAmount') || '0')
  const limitPendingAmount = parseFloat(searchParams.get('limitPendingAmount') || '0')
  const executedAmount = parseFloat(searchParams.get('executedAmount') || '0')
  const pendingAmount = parseFloat(searchParams.get('pendingAmount') || '0')

  const handleContinue = () => {
    router.push("/dashboard")
  }

  const getSuccessMessage = () => {
    // Handle hybrid execution (Scenario 3)
    if (executionType === 'hybrid') {
      const executedFormatted = formatCurrency(marketExecutedAmount, toCurrency as 'EUR' | 'AOA')
      const pendingFormatted = formatCurrency(limitPendingAmount, toCurrency as 'EUR' | 'AOA')

      return (
        <>
          Você recebeu <strong>{executedFormatted}</strong> na sua carteira e o restante (<strong>{pendingFormatted}</strong>) será convertido quando houver liquidez.
        </>
      )
    }

    // Handle full market execution (Scenario 1: Market Orders)
    if (executionType === 'market') {
      const executedFormatted = formatCurrency(executedAmount, toCurrency as 'EUR' | 'AOA')
      return (
        <>
          Você recebeu <strong>{executedFormatted}</strong> na sua carteira.
        </>
      )
    }

    // Handle limit order execution (Scenario 2: Limit Orders)
    if (executionType === 'limit') {
      const pendingFormatted = formatCurrency(pendingAmount, toCurrency as 'EUR' | 'AOA')
      return (
        <>
          Você vai receber <strong>{pendingFormatted}</strong> quando encontramos o câmbio que você quer.
        </>
      )
    }

    // Legacy behavior - determine based on exchange type
    const formattedAmount = formatCurrency(parseFloat(amount), currency as 'EUR' | 'AOA')

    if (exchangeType === 'auto') {
      // Scenario 1: Market Orders (Automatic Mode)
      return (
        <>
          Você recebeu <strong>{formattedAmount}</strong> na sua carteira.
        </>
      )
    } else {
      // Scenario 2: Limit Orders (Manual Mode)
      return (
        <>
          Você vai receber <strong>{formattedAmount}</strong> quando encontramos o câmbio que você quer.
        </>
      )
    }
  }

  return (
    <SuccessScreen
      title="Já Está!"
      message={getSuccessMessage()}
      primaryAction={{
        label: "Voltar ao início",
        onClick: handleContinue
      }}
    />
  )
}

export default function ConvertSuccessPage() {
  return (
    <Suspense fallback={
      <SuccessScreen
        title="Já Está!"
        message="Sua conversão foi processada com sucesso."
        primaryAction={{
          label: "Voltar ao início",
          onClick: () => {}
        }}
      />
    }>
      <ConvertSuccessContent />
    </Suspense>
  )
}
