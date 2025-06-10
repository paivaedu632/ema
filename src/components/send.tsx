"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"

type Step = "amount" | "recipient" | "confirmation" | "success"



interface Recipient {
  id: string
  name: string
  phone: string
  avatar?: string
  initials: string
}

export function WiseStyleTransfer() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [availableBalance] = useState("100 EUR")

  // Sample recipients list
  const [recipients] = useState<Recipient[]>([
    {
      id: "1",
      name: "Randy Rudolph",
      phone: "(123) 456-7890",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      initials: "RR"
    },
    {
      id: "2",
      name: "Randie Mcmullens",
      phone: "(123) 456-7890",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      initials: "RM"
    },
    {
      id: "3",
      name: "Raney Bold",
      phone: "(123) 456-7890",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      initials: "RB"
    },
    {
      id: "4",
      name: "Ragina Smith",
      phone: "(123) 456-7890",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      initials: "RS"
    },
    {
      id: "5",
      name: "Ra Kuo",
      phone: "(123) 456-7890",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      initials: "RK"
    }
  ])

  const handleBackToDashboard = () => {
    router.push("/")
  }

  const handleContinue = () => {
    setCurrentStep("recipient")
  }

  const handleBack = () => {
    if (currentStep === "recipient") {
      setCurrentStep("amount")
    } else if (currentStep === "confirmation") {
      setCurrentStep("recipient")
    } else if (currentStep === "success") {
      router.push("/")
    }
  }

  const handleRecipientSelect = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setCurrentStep("confirmation")
  }

  const handleSend = () => {
    if (!selectedRecipient) return
    // Handle transfer completion
    setCurrentStep("success")
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const canContinue = amount && !isNaN(Number(amount)) && Number(amount) > 0

  // Filter recipients based on search query
  const filteredRecipients = recipients.filter(recipient =>
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipient.phone.includes(searchQuery)
  )

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer enviar?"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={amount}
            currency={currency}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
          />

          <AvailableBalance amount={availableBalance} />
        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue,
            disabled: !canContinue
          }}
        />
      </div>
    )
  }

  if (currentStep === "recipient") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Para quem você quer enviar?"
            onBack={handleBack}
          />

          {/* Search Box */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="Celular ou telefone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-12 pr-4"
            />
          </div>

          {/* Recipients List */}
          <div className="mb-8">
            <div className="space-y-6">
              {filteredRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  onClick={() => handleRecipientSelect(recipient)}
                  className="recipient-list-item"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {recipient.avatar && (
                        <AvatarImage src={recipient.avatar} alt={recipient.name} />
                      )}
                      <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
                        {recipient.initials || recipient.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="heading-card mb-1">{recipient.name}</h3>
                      <p className="label-form text-gray-600">{recipient.phone}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRecipientSelect(recipient)
                    }}
                    className="small-action-button"
                  >
                    Enviar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (currentStep === "success") {
    return (
      <SuccessScreen
        title="Transferência enviada!"
        message={`Seu dinheiro foi enviado com sucesso para ${selectedRecipient?.name}.`}
        primaryAction={{
          label: "Voltar ao início",
          onClick: handleBackToHome
        }}
      />
    )
  }

  // Step 3: Confirmation
  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Confirme sua transferência"
          onBack={handleBack}
        />

        <div className="space-y-6">
          {/* Recipient Details */}
          <ConfirmationSection title="Enviar para">
            <ConfirmationRow label="Nome" value={selectedRecipient?.name || ""} />
            <ConfirmationRow label="Conta" value="EmaPay" />
            <ConfirmationRow label="Celular" value={selectedRecipient?.phone || ""} />
          </ConfirmationSection>

          {/* Transfer Details */}
          <ConfirmationSection title="Transferência">
            <ConfirmationRow label="Seu saldo" value={availableBalance} />
            <ConfirmationRow label="Você envia" value={`${amount} ${currency}`} />
            <ConfirmationRow label={`${selectedRecipient?.name} recebe`} value={`${amount} ${currency}`} highlight />
            <ConfirmationRow label="Tempo estimado" value="Segundos" />
          </ConfirmationSection>

          {/* Warning */}
          <ConfirmationWarning>
            <p className="label-form">
              A transferência será processada imediatamente e não poderá ser cancelada.
            </p>
            <p className="label-form mt-1">
              Verifique todos os dados antes de confirmar.
            </p>
          </ConfirmationWarning>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Confirmar",
          onClick: handleSend
        }}
      />
    </div>
  )
}
