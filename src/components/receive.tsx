"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { QRCodeSVG } from "qrcode.react"

export function ReceivePayment() {
  const router = useRouter()

  // Mock data - in real app this would come from user profile/API
  const phoneNumber = "+5511985167926"
  const qrCodeValue = phoneNumber
  
  const handleBackToDashboard = () => {
    router.push("/")
  }
  


  const handleShare = () => {
    // Handle sharing payment information
    console.log("Share payment info clicked")
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <PageHeader
          title="Receber dinheiro"
          subtitle="Compartilhe seu número e receba dinheiro de outras contas EmaPay em segundos."
          onBack={handleBackToDashboard}
        />

        {/* QR Code Section */}
        <div className="flex justify-center mb-8">
          <div className="card-info">
            <QRCodeSVG
              value={qrCodeValue}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              marginSize={0}
            />
          </div>
        </div>

        {/* Phone Number Section */}
        <div className="flex items-center justify-center mb-16">
          <span className="heading-card">{phoneNumber}</span>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Compartilhar",
          onClick: handleShare
        }}
      />
    </div>
  )
}
