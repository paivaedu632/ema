'use client'

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { useKYC } from "@/contexts/kyc-context"

interface KYCRadioSelectionProps {
  title: string
  subtitle?: string
  fieldKey: keyof ReturnType<typeof useKYC>['data']
  options: string[]
  backPath: string
  nextPath: string
  radioName: string
  className?: string
}

/**
 * Reusable KYC radio selection component for choice-based steps
 * Eliminates duplicate code across income-source, monthly-income, and app-use steps
 * Follows EmaPay KYC design patterns with black radio buttons and card selection
 */
export function KYCRadioSelection({
  title,
  subtitle,
  fieldKey,
  options,
  backPath,
  nextPath,
  radioName,
  className = ""
}: KYCRadioSelectionProps) {
  const router = useRouter()
  const { data, updateData } = useKYC()

  const handleBack = () => {
    router.push(backPath)
  }

  const handleContinue = () => {
    router.push(nextPath)
  }

  const handleOptionSelect = (option: string) => {
    updateData({ [fieldKey]: option } as Record<string, unknown>)
  }

  // Get current field value
  const currentValue = String(data[fieldKey] || '')
  const canContinue = currentValue.trim() !== ""

  return (
    <div className={`page-container-white ${className}`}>
      <main className="content-container">
        <PageHeader
          title={title}
          subtitle={subtitle}
          onBack={handleBack}
        />

        <div className="space-y-4">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => handleOptionSelect(option)}
              className={`
                ${currentValue === option ? 'card-selection-active' : 'card-selection'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name={radioName}
                      value={option}
                      checked={currentValue === option}
                      onChange={() => handleOptionSelect(option)}
                      className="w-5 h-5 text-black bg-white border-2 border-black focus:ring-2 focus:ring-black checked:bg-black checked:border-black"
                      style={{
                        accentColor: '#000000'
                      }}
                    />
                  </div>
                  <span className="value-secondary">{option}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
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

/**
 * Specialized radio selection for income source step
 */
export function KYCIncomeSourceSelection({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const incomeSourceOptions = [
    "Emprego",
    "Negócio próprio",
    "Freelancer/Consultor",
    "Investimentos",
    "Remessas familiares",
    "Pensão/Reforma",
    "Outros"
  ]

  return (
    <KYCRadioSelection
      title="Qual sua principal fonte de renda?"
      fieldKey="incomeSource"
      options={incomeSourceOptions}
      backPath={backPath}
      nextPath={nextPath}
      radioName="incomeSource"
      className={className}
    />
  )
}

/**
 * Specialized radio selection for monthly income step
 */
export function KYCMonthlyIncomeSelection({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const monthlyIncomeOptions = [
    "Menos de 500 EUR",
    "500 - 1.000 EUR",
    "1.000 - 2.000 EUR",
    "2.000 - 3.000 EUR",
    "3.000 - 5.000 EUR",
    "5.000 - 10.000 EUR",
    "Mais de 10.000 EUR"
  ]

  return (
    <KYCRadioSelection
      title="Qual sua renda mensal?"
      fieldKey="monthlyIncome"
      options={monthlyIncomeOptions}
      backPath={backPath}
      nextPath={nextPath}
      radioName="monthlyIncome"
      className={className}
    />
  )
}

/**
 * Specialized radio selection for app usage step
 */
export function KYCAppUseSelection({
  backPath,
  nextPath,
  className = ""
}: {
  backPath: string
  nextPath: string
  className?: string
}) {
  const appUseOptions = [
    "Enviar dinheiro para família",
    "Receber pagamentos internacionais",
    "Vender moedas",
    "Pagar serviços no exterior",
    "Investimentos internacionais",
    "Negócios e comércio",
    "Outros"
  ]

  return (
    <KYCRadioSelection
      title="Como você vai usar o EmaPay?"
      fieldKey="appUse"
      options={appUseOptions}
      backPath={backPath}
      nextPath={nextPath}
      radioName="appUse"
      className={className}
    />
  )
}
