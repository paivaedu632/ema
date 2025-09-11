"use client"

import React from "react"
import { PhoneInput as ReactInternationalPhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  value: string // Full phone number with country code (e.g., "+244123456789")
  onChange: (phone: string) => void
  disabled?: boolean
  className?: string
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  className
}: PhoneInputProps) {
  return (
    <div className={cn("react-international-phone-emapay", className)}>
      <ReactInternationalPhoneInput
        defaultCountry="ao" // Angola as default
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputProps={{
          className: "react-international-phone-input-emapay",
          placeholder: "",
          inputMode: "numeric" as const,
        }}
        countrySelectorStyleProps={{
          className: "react-international-phone-country-selector-emapay",
        }}
      />
    </div>
  )
}
