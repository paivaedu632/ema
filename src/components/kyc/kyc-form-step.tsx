'use client'

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { FixedBottomAction } from "@/components/ui/fixed-bottom-action"
import { AuthFormField } from "@/components/ui/form-field"
import { useKYC } from "@/contexts/kyc-context"
import { DateUtils } from "@/utils/formatting-utils"

interface KYCFormStepProps {
  title: string
  subtitle?: string
  fieldKey: keyof ReturnType<typeof useKYC>['data']
  placeholder?: string
  inputType?: 'text' | 'email' | 'tel'
  backPath: string
  nextPath: string
  validation?: (value: string) => boolean
  customValidationMessage?: string
  formatValue?: (value: string) => string
  className?: string
}

/**
 * Reusable KYC form step component for simple text input steps
 * Eliminates duplicate code across full-name, occupation, and other text input steps
 * Follows EmaPay KYC design patterns with consistent layout and validation
 */
export function KYCFormStep({
  title,
  subtitle,
  fieldKey,
  placeholder = "",
  inputType = "text",
  backPath,
  nextPath,
  validation,
  customValidationMessage,
  formatValue,
  className = ""
}: KYCFormStepProps) {
  const router = useRouter()
  const { data, updateData } = useKYC()

  const handleBack = () => {
    router.push(backPath)
  }

  const handleContinue = () => {
    router.push(nextPath)
  }

  const handleChange = (value: string) => {
    const formattedValue = formatValue ? formatValue(value) : value
    updateData({ [fieldKey]: formattedValue } as any)
  }

  // Get current field value
  const currentValue = String(data[fieldKey] || '')

  // Default validation: non-empty string
  const defaultValidation = (value: string) => value.trim() !== ""

  // Use custom validation if provided, otherwise use default
  const isValid = validation ? validation(currentValue) : defaultValidation(currentValue)
  const canContinue = isValid

  return (
    <div className={`page-container-white ${className}`}>
      <main className="content-container">
        <PageHeader
          title={title}
          subtitle={subtitle}
          onBack={handleBack}
        />

        <div className="space-y-6">
          <AuthFormField
            type={inputType}
            value={currentValue}
            onChange={handleChange}
            placeholder={placeholder}
            required
          />

          {customValidationMessage && !isValid && currentValue.trim() !== "" && (
            <div className="text-sm text-red-700 mt-2">
              {customValidationMessage}
            </div>
          )}
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
 * Specialized KYC form step for date of birth with date formatting and validation
 */
export function KYCDateFormStep({
  title,
  subtitle,
  fieldKey,
  backPath,
  nextPath,
  className = ""
}: Omit<KYCFormStepProps, 'validation' | 'formatValue' | 'inputType' | 'placeholder'>) {
  
  // Use centralized date utilities
  const formatDateValue = DateUtils.formatInput
  const validateDate = DateUtils.isValid

  return (
    <KYCFormStep
      title={title}
      subtitle={subtitle}
      fieldKey={fieldKey}
      placeholder="DD/MM/AAAA"
      inputType="text"
      backPath={backPath}
      nextPath={nextPath}
      validation={validateDate}
      formatValue={formatDateValue}
      customValidationMessage="Por favor, insira uma data válida no formato DD/MM/AAAA"
      className={className}
    />
  )
}

/**
 * Specialized KYC form step for email with email validation
 */
export function KYCEmailFormStep({
  title,
  subtitle,
  fieldKey,
  backPath,
  nextPath,
  className = ""
}: Omit<KYCFormStepProps, 'validation' | 'inputType' | 'placeholder'>) {
  
  // Email validation function
  const validateEmail = (email: string) => {
    return email.includes('@') && email.trim() !== ""
  }

  return (
    <KYCFormStep
      title={title}
      subtitle={subtitle}
      fieldKey={fieldKey}
      placeholder="seu@email.com"
      inputType="email"
      backPath={backPath}
      nextPath={nextPath}
      validation={validateEmail}
      customValidationMessage="Por favor, insira um email válido"
      className={className}
    />
  )
}
