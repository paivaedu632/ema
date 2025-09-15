'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface TransactionItemProps {
  name: string
  description: string
  amount?: string
  avatar?: string
  initials?: string
  actionButton?: {
    label: string
    onClick: () => void
    className?: string
  }
  onClick?: () => void
  className?: string
}

export function TransactionItem({
  name,
  description,
  amount,
  avatar,
  initials,
  actionButton,
  onClick,
  className = ""
}: TransactionItemProps) {
  const isClickable = !!onClick
  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`
        ${isClickable ? 'card-transaction' : 'flex items-center justify-between py-3'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {(avatar || initials) && (
            <Avatar className="h-12 w-12">
              {avatar && <AvatarImage src={avatar} alt={name} />}
              <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
                {initials || name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className={avatar || initials ? '' : 'ml-0'}>
            <p className="value-secondary">{name}</p>
            <p className="label-form">{description}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          {amount && (
            <p className="value-secondary">{amount}</p>
          )}
          {actionButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                actionButton.onClick()
              }}
              className={actionButton.className || "small-action-button"}
            >
              {actionButton.label}
            </Button>
          )}
        </div>
      </div>
    </Component>
  )
}
