import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ===== TRANSACTION TYPES =====

export interface TransactionRequest {
  amount: string
  currency: 'EUR' | 'AOA'
  exchangeRate?: number
  recipient?: {
    name: string
    email: string
    phone?: string
    notes?: string
  }
}

export interface TransactionResponse {
  success: boolean
  data?: {
    transaction_id?: string;
    order_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    created_at?: string;
    [key: string]: unknown;
  }
  error?: string
  message?: string
}

export type TransactionType = 'buy' | 'sell' | 'send'

// ===== TRANSACTION HOOK =====

/**
 * Custom hook for handling transaction operations
 * Provides consistent state management and API calls for buy/sell/send transactions
 */
export function useTransaction(type: TransactionType) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransactionResponse['data'] | null>(null)
  const router = useRouter()

  const processTransaction = async (request: TransactionRequest): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const endpoint = `/api/transactions/${type}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data: TransactionResponse = await response.json()

      if (data.success) {
        setResult(data.data)
        return true
      } else {
        setError(data.error || 'Erro ao processar transação')
        return false
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setError(null)
    setResult(null)
  }

  const navigateToSuccess = (transactionId?: string) => {
    const successRoutes = {
      buy: '/buy/success',
      sell: '/sell/success',
      send: '/send/success'
    }
    
    const route = transactionId 
      ? `${successRoutes[type]}?id=${transactionId}`
      : successRoutes[type]
    
    router.push(route)
  }

  const navigateToError = (errorMessage?: string) => {
    const errorRoutes = {
      buy: '/buy/error',
      sell: '/sell/error',
      send: '/send/error'
    }
    
    const route = errorMessage 
      ? `${errorRoutes[type]}?error=${encodeURIComponent(errorMessage)}`
      : errorRoutes[type]
    
    router.push(route)
  }

  return {
    isLoading,
    error,
    result,
    processTransaction,
    reset,
    navigateToSuccess,
    navigateToError
  }
}

// ===== WALLET DATA HOOK =====

export interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available_balance: number
  reserved_balance: number
}

export interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  timestamp: string
  description?: string
}

/**
 * Custom hook for fetching and managing wallet data
 * Provides consistent wallet balance and transaction fetching
 */
export function useWalletData() {
  const [balances, setBalances] = useState<WalletBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/wallet/balances')
      
      if (response.ok) {
        const data = await response.json()
        setBalances(data.balances || [])
        return true
      } else {
        setError('Erro ao carregar saldos')
        return false
      }
    } catch (err) {
      setError('Erro de conexão')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactions = async (limit = 10): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/wallet/transactions?limit=${limit}`)
      
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        return true
      } else {
        setError('Erro ao carregar transações')
        return false
      }
    } catch (err) {
      setError('Erro de conexão')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    await Promise.all([
      fetchBalances(),
      fetchTransactions()
    ])
  }

  const getBalance = (currency: 'EUR' | 'AOA', type: 'available' | 'reserved' = 'available'): number => {
    const balance = balances.find(b => b.currency === currency)
    if (!balance) return 0
    
    return type === 'available' ? balance.available_balance : balance.reserved_balance
  }

  const getTotalBalance = (currency: 'EUR' | 'AOA'): number => {
    const balance = balances.find(b => b.currency === currency)
    if (!balance) return 0
    
    return balance.available_balance + balance.reserved_balance
  }

  return {
    balances,
    transactions,
    isLoading,
    error,
    fetchBalances,
    fetchTransactions,
    refreshData,
    getBalance,
    getTotalBalance
  }
}

// ===== FORM VALIDATION HOOK =====

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

/**
 * Custom hook for form validation
 * Provides consistent validation logic across forms
 */
export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  const validateField = (name: string, value: string): string | null => {
    const rule = rules[name]
    if (!rule) return null

    if (rule.required && (!value || value.trim() === '')) {
      return 'Este campo é obrigatório'
    }

    if (rule.minLength && value.length < rule.minLength) {
      return `Mínimo ${rule.minLength} caracteres`
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return `Máximo ${rule.maxLength} caracteres`
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return 'Formato inválido'
    }

    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }

  const validate = (values: { [key: string]: string }): boolean => {
    const newErrors: { [key: string]: string } = {}
    let isValid = true

    Object.keys(rules).forEach(name => {
      const error = validateField(name, values[name] || '')
      if (error) {
        newErrors[name] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const validateSingle = (name: string, value: string) => {
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }))
    return !error
  }

  const setFieldTouched = (name: string, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched
    }))
  }

  const reset = () => {
    setErrors({})
    setTouched({})
  }

  const getFieldError = (name: string): string | undefined => {
    return touched[name] ? errors[name] : undefined
  }

  const hasErrors = (): boolean => {
    return Object.values(errors).some(error => error !== '')
  }

  return {
    errors,
    touched,
    validate,
    validateSingle,
    setFieldTouched,
    reset,
    getFieldError,
    hasErrors
  }
}
