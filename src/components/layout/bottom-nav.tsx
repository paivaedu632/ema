'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  ArrowUpDown,
  ArrowLeftRight,
  RefreshCw,
  User
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  activePattern?: RegExp
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Início',
    icon: Home,
    activePattern: /^\/$/
  },
  {
    href: '/convert',
    label: 'Converter',
    icon: ArrowUpDown,
    activePattern: /^\/convert$/
  },
  {
    href: '/convert-2',
    label: 'Converter 2',
    icon: ArrowLeftRight,
    activePattern: /^\/convert-2$/
  },
  {
    href: '/convert-3',
    label: 'Converter 3',
    icon: RefreshCw,
    activePattern: /^\/convert-3$/
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: User,
    activePattern: /^\/profile/
  }
]

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.activePattern) {
      return item.activePattern.test(pathname)
    }
    return pathname === item.href
  }

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb",
      className
    )}>
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors",
                "hover:bg-gray-50 active:bg-gray-100",
                active && "text-black"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mb-1 transition-colors",
                  active ? "text-black" : "text-gray-500"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors truncate",
                  active ? "text-black" : "text-gray-500"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Safe area padding for devices with home indicators
export function BottomNavSpacer({ className }: { className?: string }) {
  return (
    <div className={cn("h-20 safe-area-pb", className)} />
  )
}
