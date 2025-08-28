"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/ui/page-header"
import { AmountInput } from "@/components/ui/amount-input"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { SuccessScreen } from "@/components/ui/success-screen"
import { ConfirmationSection, ConfirmationRow, ConfirmationWarning } from "@/components/ui/confirmation-section"
import { AvailableBalance } from "@/components/ui/available-balance"
import { TRANSACTION_LIMITS, VALIDATION_MESSAGES } from "@/utils/transaction-validation"



type Step = "amount" | "recipient" | "confirmation" | "success"

interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available_balance: number
  reserved_balance: number
  last_updated: string
}

interface Recipient {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  initials: string
  created_at?: string
}

// Zod validation schema with proper error hierarchy
const createSendAmountSchema = (availableBalance: number, currency: string) => {
  const limit = TRANSACTION_LIMITS[currency as keyof typeof TRANSACTION_LIMITS] || TRANSACTION_LIMITS.EUR

  return z.object({
    amount: z.string()
      .min(1, VALIDATION_MESSAGES.AMOUNT.REQUIRED)
      .transform((val) => {
        const num = Number(val)
        if (isNaN(num) || num <= 0) {
          throw new z.ZodError([{
            code: "custom",
            message: VALIDATION_MESSAGES.AMOUNT.INVALID,
            path: ["amount"]
          }])
        }
        return num
      })
      .refine((val) => val >= limit.min, {
        message: VALIDATION_MESSAGES.AMOUNT.MIN(limit.min, currency)
      })
      .refine((val) => val <= limit.max, {
        message: VALIDATION_MESSAGES.AMOUNT.MAX(limit.max, currency)
      })
      .refine((val) => val <= availableBalance, {
        message: VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE
      }),
    currency: z.enum(["EUR", "AOA"])
  })
}

type SendAmountForm = z.infer<ReturnType<typeof createSendAmountSchema>>

export function WiseStyleTransfer() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  // Get current available balance for selected currency
  const getCurrentBalance = (currency: string): number => {
    const wallet = walletBalances.find(w => w.currency === currency)
    return wallet?.available_balance || 0
  }

  // React Hook Form setup with dynamic schema
  const form = useForm<SendAmountForm>({
    resolver: zodResolver(createSendAmountSchema(getCurrentBalance("EUR"), "EUR")),
    mode: "onChange",
    defaultValues: {
      amount: "",
      currency: "EUR"
    }
  })

  const { watch, setValue, formState: { errors, isValid } } = form
  const watchedCurrency = watch("currency")
  const watchedAmount = watch("amount")

  // Update form schema when currency or balance changes
  useEffect(() => {
    const currentBalance = getCurrentBalance(watchedCurrency)
    const newSchema = createSendAmountSchema(currentBalance, watchedCurrency)

    // Update the resolver with new schema
    form.clearErrors()
    // Re-validate current amount with new schema
    if (watchedAmount) {
      form.trigger("amount")
    }
  }, [watchedCurrency, walletBalances, form, watchedAmount])

  // Fetch wallet balances on component mount
  useEffect(() => {
    const fetchWalletBalances = async () => {
      try {
        const response = await fetch('/api/wallet/balances')
        if (response.ok) {
          const result = await response.json()
          setWalletBalances(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching wallet balances:', error)
      } finally {
        setBalancesLoading(false)
      }
    }

    fetchWalletBalances()
  }, [])

  // Search recipients function
  const searchRecipients = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setRecipients([])
      return
    }

    setRecipientsLoading(true)
    try {
      const response = await fetch(`/api/recipients/search?q=${encodeURIComponent(query.trim())}`)
      if (response.ok) {
        const result = await response.json()
        setRecipients(result.data || [])
      } else {
        console.error('Failed to search recipients')
        setRecipients([])
      }
    } catch (error) {
      console.error('Error searching recipients:', error)
      setRecipients([])
    } finally {
      setRecipientsLoading(false)
    }
  }, [])

  // Search recipients with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRecipients(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchRecipients])

  // Format balance for display
  const getFormattedBalance = (): string => {
    const currentWallet = walletBalances.find(wallet => wallet.currency === watchedCurrency)
    if (!currentWallet) return `0.00 ${watchedCurrency}`
    return `${currentWallet.available_balance.toFixed(2)} ${watchedCurrency}`
  }

  const handleBackToDashboard = () => {
    router.push("/")
  }

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep("recipient")
    }
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

  const handleSend = async () => {
    if (!selectedRecipient || !isValid) return

    const formData = form.getValues()

    try {
      const response = await fetch('/api/transactions/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formData.amount,
          currency: formData.currency,
          recipient: {
            name: selectedRecipient.name,
            email: selectedRecipient.email,
            phone: selectedRecipient.phone
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        setCurrentStep("success")
      } else {
        console.error('Send transaction failed:', result.error)
        alert(`Erro na transação: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing send transaction:', error)
      alert('Erro ao processar transação. Tente novamente.')
    }
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  // Get the primary error message (first error from form)
  const getPrimaryErrorMessage = (): string => {
    if (errors.amount?.message) {
      return errors.amount.message
    }
    return ""
  }

  if (currentStep === "amount") {
    return (
      <div className="page-container-white">
        <main className="content-container">
          <PageHeader
            title="Quanto você quer enviar?"
            onBack={handleBackToDashboard}
          />

          <AmountInput
            amount={watchedAmount}
            currency={watchedCurrency}
            onAmountChange={(value) => setValue("amount", value)}
            onCurrencyChange={(value) => setValue("currency", value as "EUR" | "AOA")}
            transactionType="send"
            showValidation={false}
            className="mb-3"
          />

          {/* Primary validation error - shows highest priority error only */}
          {getPrimaryErrorMessage() && (
            <p className="form-error-ema">{getPrimaryErrorMessage()}</p>
          )}

          {balancesLoading ? (
            <div className="mb-3">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            <AvailableBalance amount={getFormattedBalance()} />
          )}

        </main>

        <FixedBottomAction
          primaryAction={{
            label: "Continuar",
            onClick: handleContinue,
            disabled: !isValid || balancesLoading
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
              placeholder="Digite email, telefone ou nome"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-12 pr-4"
            />
          </div>

          {/* Recipients List */}
          <div className="mb-8">
            {recipientsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Digite pelo menos 2 caracteres para buscar usuários</p>
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum usuário encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Tente buscar por email, telefone ou nome</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    onClick={() => handleRecipientSelect(recipient)}
                    className="recipient-list-item"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
                          {recipient.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="heading-card mb-1">{recipient.name}</h3>
                        <p className="label-form text-gray-600">{recipient.email}</p>
                        {recipient.phone && (
                          <p className="label-form text-gray-500 text-xs">{recipient.phone}</p>
                        )}
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
            )}
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
            <ConfirmationRow label="Email" value={selectedRecipient?.email || ""} />
            <ConfirmationRow label="Conta" value="EmaPay" />
          </ConfirmationSection>

          {/* Transfer Details */}
          <ConfirmationSection title="Transferência">
            <ConfirmationRow label="Seu saldo" value={getFormattedBalance()} />
            <ConfirmationRow label="Você envia" value={`${watchedAmount} ${watchedCurrency}`} />
            <ConfirmationRow label={`${selectedRecipient?.name} recebe`} value={`${watchedAmount} ${watchedCurrency}`} highlight />
            <ConfirmationRow label="Vai chegar" value="Segundos" />
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
