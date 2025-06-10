"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface CodeInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  className?: string
}

export function CodeInput({ length = 6, value, onChange, className = "" }: CodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Update digits when value prop changes
  useEffect(() => {
    const newDigits = value.split("").slice(0, length)
    while (newDigits.length < length) {
      newDigits.push("")
    }
    setDigits(newDigits)
  }, [value, length])

  const handleInputChange = (index: number, inputValue: string) => {
    // Only allow single digit
    const digit = inputValue.slice(-1)
    
    if (!/^\d*$/.test(digit)) return // Only allow numbers

    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    // Update parent component
    onChange(newDigits.join(""))

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    
    if (pastedData) {
      const newDigits = Array(length).fill("")
      for (let i = 0; i < pastedData.length && i < length; i++) {
        newDigits[i] = pastedData[i]
      }
      setDigits(newDigits)
      onChange(newDigits.join(""))
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div className={`flex gap-3 justify-center ${className}`}>
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          value={digit}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-16 text-center text-xl font-medium form-input-standard focus:border-2 focus:border-black focus:ring-0 focus:outline-none"
          maxLength={1}
          data-testid={`code-input-${index}`}
        />
      ))}
    </div>
  )
}
