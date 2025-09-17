"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SuccessScreen } from "@/components/ui/success-screen"
import { Suspense } from "react"
import { formatCurrency } from "@/lib/utils"

function ConvertSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const exchangeType = searchParams.get('type') || 'auto'
  const amount = searchParams.get('amount') || '0'
  const currency = searchParams.get('currency') || 'AOA'

  const handleContinue = () => {
    router.push("/dashboard")
  }

  const getSuccessMessage = () => {
    const formattedAmount = formatCurrency(parseFloat(amount), currency as 'EUR' | 'AOA')

    if (exchangeType === 'auto') {
      return (
        <>
          Você recebeu <strong>{formattedAmount}</strong> na sua carteira.
        </>
      )
    } else {
      return (
        <>
          Reservamos <strong>{formattedAmount}</strong> da sua carteira até encontrarmos o câmbio que você quer. Mas você pode retirar sempre que quiser.
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
