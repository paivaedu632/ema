'use client'

import React from 'react'

interface ConfirmationRowProps {
  label: string
  value: string
  highlight?: boolean
}

export function ConfirmationRow({ label, value, highlight = false }: ConfirmationRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className={highlight ? "text-xl font-bold text-gray-900" : "font-medium text-gray-900"}>
        {value}
      </span>
    </div>
  )
}

interface ConfirmationSectionProps {
  title: string
  children: React.ReactNode
}

export function ConfirmationSection({ title, children }: ConfirmationSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

interface ConfirmationWarningProps {
  title?: string
  children: React.ReactNode
}

export function ConfirmationWarning({ title = "Atenção:", children }: ConfirmationWarningProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-2xl">
      <p className="label-form">
        <span className="heading-small">{title}</span>
      </p>
      <div className="mt-1">
        {children}
      </div>
    </div>
  )
}
