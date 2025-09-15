// Core Types
export interface User {
  id: string
  email: string
  name?: string
  phone?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available: number
  pending: number
  total: number
  lastUpdated: string
}

export interface Transaction {
  id: string
  displayId?: string
  type: 'send' | 'receive' | 'deposit' | 'withdraw' | 'exchange'
  amount: number
  currency: 'EUR' | 'AOA'
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description?: string
  createdAt: string
  updatedAt: string
  recipientId?: string
  senderId?: string
  recipient?: User
  sender?: User
  metadata?: Record<string, unknown>
}

export interface TransferRequest {
  recipientId: string
  amount: number
  currency: 'EUR' | 'AOA'
  pin: string
  description?: string
}

export interface ExchangeRate {
  from: 'EUR' | 'AOA'
  to: 'EUR' | 'AOA'
  rate: number
  timestamp: string
}

export interface MarketData {
  pair: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
  timestamp: string
}

export interface OrderBookEntry {
  price: number
  amount: number
  total: number
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  timestamp: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  name?: string
  phone?: string
}

export interface SendMoneyForm {
  recipientId: string
  amount: string
  currency: 'EUR' | 'AOA'
  description?: string
}

export interface DepositForm {
  amount: string
  currency: 'EUR' | 'AOA'
  method: 'bank_transfer' | 'card' | 'mobile_money'
}

export interface WithdrawForm {
  amount: string
  currency: 'EUR' | 'AOA'
  method: 'bank_transfer' | 'mobile_money'
  destination: string
}

// KYC Types
export interface KYCDocument {
  id: string
  type: 'passport' | 'id_card' | 'drivers_license'
  frontImage?: string
  backImage?: string
  status: 'pending' | 'approved' | 'rejected'
  uploadedAt: string
}

export interface KYCProfile {
  id: string
  userId: string
  status: 'incomplete' | 'pending' | 'approved' | 'rejected'
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  documents: KYCDocument[]
  createdAt: string
  updatedAt: string
}

// Utility Types
export type Currency = 'EUR' | 'AOA'
export type TransactionType = 'send' | 'receive' | 'deposit' | 'withdraw' | 'exchange'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type KYCStatus = 'incomplete' | 'pending' | 'approved' | 'rejected'

// Component Props Types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface PageProps {
  params: Record<string, string>
  searchParams: Record<string, string | string[] | undefined>
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

// Navigation Types
export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

// Notification Types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}
