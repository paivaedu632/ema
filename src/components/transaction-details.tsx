"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"

interface TransactionDetailsProps {
  transactionId?: string
}

export function TransactionDetails({ transactionId = "#155034567" }: TransactionDetailsProps) {
  const router = useRouter()

  // Mock transaction data - in real app this would come from API based on transactionId
  const transactionData = {
    sentAmount: "40 EUR",
    fee: "0.80 EUR",
    convertedAmount: "39.20 EUR",
    exchangeRate: "1 EUR = 6.3423 BRL",
    receivedAmount: "248.62 BRL",
    transactionNumber: transactionId,
    recipientDetails: {
      type: "Private",
      nickname: "Pagseguro",
      accountNickname: "Pagseguro",
      bankCode: "290",
      branchCode: "0001",
      accountNumber: "09426976-8",
      accountType: "Checking",
      taxRegistration: "23846928879",
      phoneNumber: "+5511985167926",
      accountHolderName: "Edgar Agostinho Rodrigues Paiva",
      email: "paivaedu.br@gmail.com",
      bankName: "PAGSEGURO INTERNET INSTITUIÇÃO DE PAGAMENTO S.A."
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleHelp = () => {
    // TODO: Handle help action
  }

  const handleMenu = () => {
    // TODO: Handle menu action
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <BackButton onClick={handleBack} />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHelp}
              className="p-2"
            >
              <HelpCircle className="w-6 h-6 text-gray-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenu}
              className="p-2"
            >
              <MoreHorizontal className="w-6 h-6 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Page Title */}
        <h1 className="heading-main mb-8">Transaction details</h1>

        {/* Transaction Summary */}
        <div className="card-content mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-body">You sent</span>
              <span className="value-secondary">{transactionData.sentAmount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-body">Wise&apos;s fees</span>
              <span className="value-secondary">{transactionData.fee}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-body">We converted</span>
              <span className="value-secondary">{transactionData.convertedAmount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-body">Exchange rate</span>
              <span className="value-secondary">{transactionData.exchangeRate}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="value-primary font-semibold">You received</span>
                <span className="value-large">{transactionData.receivedAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Number */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <span className="text-body">Transaction number</span>
            <span className="value-secondary">{transactionData.transactionNumber}</span>
          </div>
        </div>

        {/* Account Details Section */}
        <div className="mb-8">
          <h2 className="heading-section mb-4">Your account details</h2>
          
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-body">Recipient type</span>
                <span className="value-secondary">{transactionData.recipientDetails.type}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Nickname</span>
                <span className="value-secondary">{transactionData.recipientDetails.nickname}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Account nickname</span>
                <span className="value-secondary">{transactionData.recipientDetails.accountNickname}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Bank code</span>
                <span className="value-secondary">{transactionData.recipientDetails.bankCode}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Branch code</span>
                <span className="value-secondary">{transactionData.recipientDetails.branchCode}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Account number</span>
                <span className="value-secondary">{transactionData.recipientDetails.accountNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Account type</span>
                <span className="value-secondary">{transactionData.recipientDetails.accountType}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Tax registration number (CPF)</span>
                <span className="value-secondary">{transactionData.recipientDetails.taxRegistration}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Recipient&apos;s phone number</span>
                <span className="value-secondary">{transactionData.recipientDetails.phoneNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Account holder name</span>
                <span className="value-secondary">{transactionData.recipientDetails.accountHolderName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-body">Email (Optional)</span>
                <span className="value-secondary">{transactionData.recipientDetails.email}</span>
              </div>
              
              <div className="flex justify-between items-start">
                <span className="text-body">Bank name</span>
                <span className="value-secondary text-right max-w-[200px]">{transactionData.recipientDetails.bankName}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
