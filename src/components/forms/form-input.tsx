import React from 'react'

// ===== FORM INPUT COMPONENTS =====

interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number'
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
