'use client'

import React from 'react'

interface FlagIconProps {
  countryCode: string
  alt?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Size mappings for consistent flag sizing across EmaPay
const sizeClasses = {
  sm: 'w-4 h-4',   // 16px - for very compact contexts
  md: 'w-5 h-5',   // 20px - for currency selectors (tight, professional)
  lg: 'w-6 h-6',   // 24px - for standard displays
  xl: 'w-8 h-8'    // 32px - for prominent displays
}

export function FlagIcon({
  countryCode,
  alt,
  className,
  size = 'md'
}: FlagIconProps) {
  const flagUrl = `https://flagicons.lipis.dev/flags/4x3/${countryCode.toLowerCase()}.svg`
  const altText = alt || `${countryCode.toUpperCase()} flag`

  // Use size prop if no custom className provided
  const sizeClass = className || sizeClasses[size]

  return (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${sizeClass}`}>
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
