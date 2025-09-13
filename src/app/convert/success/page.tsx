"use client"

import { useRouter } from "next/navigation"
import { SuccessScreen } from "@/components/ui/success-screen"

export default function ConvertSuccessPage() {
  const router = useRouter()

  const handleContinue = () => {
    router.push("/dashboard")
  }

  return (
    <SuccessScreen
      title="Conversão realizada!"
      message="Sua conversão foi processada com sucesso. O valor já está disponível na sua conta."
      primaryAction={{
        label: "Voltar ao início",
        onClick: handleContinue
      }}
    />
  )
}
