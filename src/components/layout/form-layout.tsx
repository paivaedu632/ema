'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ===== FORM LAYOUT COMPONENTS =====

interface FormLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backButtonHref?: string
  className?: string
}

/**
 * Standard form layout with optional back button and title
 * Follows EmaPay's consistent form styling patterns
 */
export function FormLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
  backButtonHref = '/',
  className = ''
}: FormLayoutProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backButtonHref) {
      router.push(backButtonHref)
    } else {
      router.back()
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-md mx-auto pt-8 px-4">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-6 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        {title && (
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 text-base">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  )
}

// ===== FORM SECTION COMPONENTS =====

interface FormSectionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standard form section with EmaPay card styling
 */
export function FormSection({ children, className = '' }: FormSectionProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 mb-6 ${className}`}>
      {children}
    </div>
  )
}

// ===== FORM FIELD COMPONENTS =====

interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Standard form field wrapper with label and error handling
 */
export function FormField({
  label,
  error,
  required = false,
  children,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-red-700 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

// ===== FORM BUTTON COMPONENTS =====

interface FormButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  loading?: boolean
  className?: string
}

/**
 * Standard form button following EmaPay design system
 */
export function FormButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = ''
}: FormButtonProps) {
  const baseClasses = 'w-full h-12 text-base px-4 rounded-full font-medium transition-colors'
  
  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-100'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? 'Carregando...' : children}
    </button>
  )
}

// ===== FORM INPUT COMPONENTS =====

interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Standard form input following EmaPay design system
 */
export function FormInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error = false,
  disabled = false,
  className = ''
}: FormInputProps) {
  const baseClasses = 'w-full h-12 text-base px-3 rounded-2xl border-2 transition-colors'
  const errorClasses = error ? 'border-red-700' : 'border-black focus:border-black'
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className={`${baseClasses} ${errorClasses} ${className}`}
    />
  )
}

// ===== FORM TEXTAREA COMPONENTS =====

interface FormTextareaProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: boolean
  disabled?: boolean
  rows?: number
  className?: string
}

/**
 * Standard form textarea following EmaPay design system
 */
export function FormTextarea({
  placeholder,
  value,
  onChange,
  onBlur,
  error = false,
  disabled = false,
  rows = 4,
  className = ''
}: FormTextareaProps) {
  const baseClasses = 'w-full text-base px-3 py-3 rounded-2xl border-2 transition-colors resize-none'
  const errorClasses = error ? 'border-red-700' : 'border-black focus:border-black'
  
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      rows={rows}
      className={`${baseClasses} ${errorClasses} ${className}`}
    />
  )
}

// ===== SUCCESS/ERROR SCREENS =====

interface FormResultScreenProps {
  type: 'success' | 'error'
  title: string
  message: string
  buttonText?: string
  onButtonClick?: () => void
  showBackButton?: boolean
}

/**
 * Standard success/error screen for form completion
 */
export function FormResultScreen({
  type,
  title,
  message,
  buttonText = 'Continuar',
  onButtonClick,
  showBackButton = false
}: FormResultScreenProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push('/')
  }

  return (
    <FormLayout showBackButton={showBackButton}>
      <FormSection className="text-center">
        <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
          type === 'success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <div className={`text-2xl ${
            type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {type === 'success' ? '✓' : '✕'}
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {title}
        </h2>
        
        <p className="text-gray-600 mb-8">
          {message}
        </p>
        
        <FormButton
          variant="primary"
          onClick={onButtonClick || handleBack}
        >
          {buttonText}
        </FormButton>
      </FormSection>
    </FormLayout>
  )
}
