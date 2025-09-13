"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SuccessScreen } from "@/components/ui/success-screen"
import { Suspense } from "react"

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
    if (exchangeType === 'auto') {
      return `Você recebeu ${amount} ${currency} na sua carteira.`
    } else {
      return `Reservamos ${amount} ${currency} da sua carteira até encontrarmos um comprador. Mas você pode retirar sempre que quiser.`
    }
  }

  return (
    <SuccessScreen
      title="Já está!"
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
        title="Já está!"
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
