'use client'

import React from 'react'
import { LucideIcon, ChevronRight } from 'lucide-react'

interface OptionSelectorItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  onClick: () => void
}

interface OptionSelectorProps {
  items: OptionSelectorItem[]
  className?: string
}

/**
 * Reusable option selector component for choosing between different options
 * Used in sell flow for rate type selection, can be reused for other selection flows
 * Follows EmaPay design patterns with icons, titles, descriptions, and chevron indicators
 */
export function OptionSelector({ items, className = "" }: OptionSelectorProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className="flex items-center justify-between cursor-pointer py-4 hover:bg-gray-50 rounded-lg px-2 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <item.icon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      ))}
    </div>
  )
}

interface RadioOptionSelectorItem {
  id: string
  title: string
  description?: string
  icon?: LucideIcon
  value: string
}

interface RadioOptionSelectorProps {
  items: RadioOptionSelectorItem[]
  value: string
  onChange: (value: string) => void
  name: string
  className?: string
}

/**
 * Radio-based option selector for single selection with visual feedback
 * Alternative to OptionSelector when radio button behavior is needed
 */
export function RadioOptionSelector({
  items,
  value,
  onChange,
  name,
  className = ""
}: RadioOptionSelectorProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-4 cursor-pointer p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <input
            type="radio"
            name={name}
            value={item.value}
            checked={value === item.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-black border-black focus:ring-black focus:ring-2"
          />
          
          {item.icon && (
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <item.icon className="h-5 w-5 text-gray-600" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}

interface CardOptionSelectorItem {
  id: string
  title: string
  description?: string
  icon?: LucideIcon
  value: string
  badge?: string
}

interface CardOptionSelectorProps {
  items: CardOptionSelectorItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Card-based option selector with clickable cards
 * Used for selections where the entire card should be clickable
 * Follows EmaPay's card selection patterns
 */
export function CardOptionSelector({
  items,
  value,
  onChange,
  className = ""
}: CardOptionSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onChange(item.value)}
          className={`
            cursor-pointer p-4 rounded-lg border-2 transition-all
            ${value === item.value 
              ? 'border-black bg-gray-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {item.icon && (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <item.icon className="h-5 w-5 text-gray-600" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
                {item.badge && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
            </div>
            
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${value === item.value ? 'border-black bg-black' : 'border-gray-300'}
            `}>
              {value === item.value && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
