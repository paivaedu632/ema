'use client'

import React from 'react'

interface FlagIconProps {
  countryCode: string
  alt?: string
  className?: string
}

export function FlagIcon({ countryCode, alt, className = "w-8 h-8" }: FlagIconProps) {
  const flagUrl = `https://flagicons.lipis.dev/flags/4x3/${countryCode.toLowerCase()}.svg`
  const altText = alt || `${countryCode.toUpperCase()} flag`

  return (
    <div className={`rounded-full overflow-hidden ${className}`}>
      <img
        src={flagUrl}
        alt={altText}
        className="w-full h-full object-cover"
      />
    </div>
  )
}

// Predefined flag components for common currencies
export const AngolaFlag = () => <FlagIcon countryCode="ao" alt="Angola flag" />
export const EurFlag = () => <FlagIcon countryCode="eu" alt="EUR flag" />
export const UsdFlag = () => <FlagIcon countryCode="us" alt="USD flag" />
