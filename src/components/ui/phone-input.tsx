"use client"

import React, { useState, useEffect } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function CustomPhoneInput({
  value,
  onChange,
  placeholder = "Digite seu número de telefone",
  disabled = false,
  className,
  required = false,
  ...props
}: PhoneInputProps) {
  return (
    <div className={cn("relative", className)}>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="BR" // Default to Brazil, will be overridden by IP detection
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn(
          "phone-input-emapay",
          "w-full h-12 px-4 border border-black rounded-lg",
          "focus-within:ring-2 focus-within:ring-black focus-within:border-transparent",
          "transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        numberInputProps={{
          className: cn(
            "flex-1 bg-transparent border-0 outline-none text-base",
            "placeholder:text-gray-500"
          )
        }}
        countrySelectProps={{
          className: cn(
            "border-0 bg-transparent outline-none cursor-pointer",
            "hover:bg-gray-50 rounded-md px-2 py-1 mr-2"
          )
        }}
        {...props}
      />
    </div>
  )
}

interface SmartInputProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function SmartEmailPhoneInput({
  value = '',
  onChange,
  placeholder = "Digite seu email ou telefone",
  disabled = false,
  className,
  required = false,
  ...props
}: SmartInputProps) {
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email')

  // Detect input type based on content
  useEffect(() => {
    if (!value) {
      setInputMode('email')
      return
    }

    // If contains @ symbol, it's likely an email
    if (value.includes('@')) {
      setInputMode('email')
    }
    // If starts with + or contains only numbers/spaces/dashes, it's likely a phone
    else if (value.startsWith('+') || /^[\d\s\-\(\)]+$/.test(value.trim())) {
      setInputMode('phone')
    }
    // Default to email for other cases
    else {
      setInputMode('email')
    }
  }, [value])

  const handleChange = (newValue: string | undefined) => {
    onChange?.(newValue || '')
  }

  if (inputMode === 'phone') {
    return (
      <CustomPhoneInput
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        required={required}
        {...props}
      />
    )
  }

  return (
    <Input
      type="email"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={cn(
        "w-full h-12 px-4 border border-black rounded-lg",
        "focus:ring-2 focus:ring-black focus:border-transparent",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
}

export default CustomPhoneInput
