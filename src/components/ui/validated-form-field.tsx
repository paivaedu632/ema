'use client'

import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"

export type ValidationState = 'valid' | 'invalid' | 'neutral' | null

interface ValidatedFormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number'
  required?: boolean
  validationState?: ValidationState
  errorMessage?: string
  subtitle?: string
  className?: string
}

export function ValidatedFormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  validationState = 'neutral',
  errorMessage,
  subtitle,
  className = ''
}: ValidatedFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  // Determine if this is a password field with toggle
  const hasPasswordToggle = type === 'password'
  const inputType = hasPasswordToggle && showPassword ? 'text' : type

  // Determine border color based on validation state
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

  // Determine error message text color
  const getErrorTextClass = () => {
    return validationState === 'invalid' ? 'text-red-700' : 'text-gray-600'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="label-info">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {subtitle && (
        <p className="text-sm text-gray-600 -mt-1 mb-2">{subtitle}</p>
      )}
      
      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`form-input-validation ${getBorderClass()} ${hasPasswordToggle ? 'pr-12' : ''}`}
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
      
      {errorMessage && (
        <p className={`text-sm ${getErrorTextClass()} mt-1`}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
