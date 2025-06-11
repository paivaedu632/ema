'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

interface FormFieldProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  showPasswordToggle?: boolean
}

export function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  className = '',
  showPasswordToggle = false
}: FormFieldProps) {
  // For password fields, start with visible characters (showPassword = true by default)
  const [showPassword, setShowPassword] = React.useState(true)

  // If it's a password field and no toggle is requested, always show as text
  // If it's a password field with toggle, respect the showPassword state
  const inputType = type === 'password' && !showPasswordToggle ? 'text' :
                   type === 'password' && showPasswordToggle && showPassword ? 'text' :
                   type === 'password' && showPasswordToggle && !showPassword ? 'password' : type
  const hasPasswordToggle = type === 'password' && showPasswordToggle

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`form-input-standard ${hasPasswordToggle ? 'pr-12' : ''}`}
          placeholder={placeholder}
          required={required}
        />
        {hasPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Specialized form field for authentication-style forms with different styling
interface AuthFormFieldProps {
  label?: string
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  validationState?: 'valid' | 'invalid' | 'neutral' | null
}

export function AuthFormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  className = '',
  validationState = null
}: AuthFormFieldProps) {
  // For password fields, start with visible characters (showPassword = true by default)
  const [showPassword, setShowPassword] = React.useState(true)

  const inputType = type === 'password' && showPassword ? 'text' : type
  const hasPasswordToggle = type === 'password'

  // Determine border color based on validation state using standardized classes
  const getBorderClass = () => {
    switch (validationState) {
      case 'valid':
        return 'validation-valid' // Black border for valid state
      case 'invalid':
        return 'validation-invalid' // Dark red for invalid state
      case 'neutral':
      case null:
      default:
        return 'validation-neutral' // Default EmaPay black border
    }
  }

  return (
    <div className={`${label ? 'space-y-2' : ''} ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`form-input-auth-validation ${getBorderClass()} ${hasPasswordToggle ? 'pr-12' : ''}`}
          placeholder={placeholder}
          required={required}
        />
        {hasPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
