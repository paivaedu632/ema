"use client"

import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

export default function KYCNotificationsPage() {
  const router = useRouter()
  const { updateData } = useKYC()

  const handleBack = () => {
    router.push("/dashboard")
  }

  const handleEnableNotifications = () => {
    updateData({ notificationsEnabled: true })
    router.push("/kyc/passcode")
  }

  const handleSkipNotifications = () => {
    updateData({ notificationsEnabled: false })
    router.push("/kyc/passcode")
  }

  return (
    <div className="page-container-white">
      <main className="content-container">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell className="w-12 h-12 text-black" />
            </div>

            <div className="text-center space-y-4 max-w-sm">
              <h3 className="text-lg font-medium text-black">
                Notificações
              </h3>
              <p className="text-sm text-gray-600">
                Ative as notificações para receber informações da sua conta.
              </p>
            </div>
          </div>
        </div>
      </main>

      <FixedBottomAction
        primaryAction={{
          label: "Ativar notificações",
          onClick: handleEnableNotifications,
          disabled: false
        }}
        secondaryAction={{
          label: "Talvez mais tarde",
          onClick: handleSkipNotifications
        }}
      />
    </div>
  )
}
