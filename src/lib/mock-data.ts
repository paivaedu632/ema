// Mock data for UI development
// This file provides realistic mock data for all features without API calls

import { User, WalletBalance, Transaction, TransactionType } from '@/types'

// ===== MOCK USER DATA =====

export const mockUser: User = {
  id: 'user-123',
  email: 'joao.silva@example.com',
  name: 'João Silva',
  phone: '+244 912 345 678',
  avatar: null,
  isVerified: true,
  kycStatus: 'approved',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-03-10T14:20:00Z'
}

// ===== MOCK WALLET DATA =====

export const mockWalletBalances: WalletBalance[] = [
  {
    currency: 'EUR',
    available: 2450.75,
    reserved: 150.25,
    total: 2601.00
  },
  {
    currency: 'AOA',
    available: 485000,
    reserved: 25000,
    total: 510000
  }
]

// ===== MOCK TRANSACTION DATA =====

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    type: 'send',
    amount: 125.50,
    currency: 'EUR',
    status: 'completed',
    description: 'Transferência para Maria Santos',
    recipientName: 'Maria Santos',
    recipientEmail: 'maria.santos@example.com',
    createdAt: '2024-03-10T09:15:00Z',
    completedAt: '2024-03-10T09:15:30Z'
  },
  {
    id: 'tx-002',
    type: 'receive',
    amount: 75000,
    currency: 'AOA',
    status: 'completed',
    description: 'Recebido de Pedro Costa',
    senderName: 'Pedro Costa',
    senderEmail: 'pedro.costa@example.com',
    createdAt: '2024-03-09T16:45:00Z',
    completedAt: '2024-03-09T16:45:15Z'
  },
  {
    id: 'tx-003',
    type: 'exchange',
    amount: 200.00,
    currency: 'EUR',
    status: 'completed',
    description: 'Conversão EUR → AOA',
    exchangeRate: 650.50,
    exchangedAmount: 130100,
    exchangedCurrency: 'AOA',
    createdAt: '2024-03-08T11:20:00Z',
    completedAt: '2024-03-08T11:20:45Z'
  },
  {
    id: 'tx-004',
    type: 'send',
    amount: 50.00,
    currency: 'EUR',
    status: 'pending',
    description: 'Transferência para Ana Ferreira',
    recipientName: 'Ana Ferreira',
    recipientEmail: 'ana.ferreira@example.com',
    createdAt: '2024-03-10T14:30:00Z'
  },
  {
    id: 'tx-005',
    type: 'deposit',
    amount: 500.00,
    currency: 'EUR',
    status: 'completed',
    description: 'Depósito via cartão',
    createdAt: '2024-03-07T08:10:00Z',
    completedAt: '2024-03-07T08:12:00Z'
  }
]

// ===== MOCK USERS FOR SEARCH =====

export const mockSearchUsers = [
  {
    id: 'user-456',
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    phone: '+244 923 456 789',
    avatar: null
  },
  {
    id: 'user-789',
    name: 'Pedro Costa',
    email: 'pedro.costa@example.com',
    phone: '+351 912 345 678',
    avatar: null
  },
  {
    id: 'user-101',
    name: 'Ana Ferreira',
    email: 'ana.ferreira@example.com',
    phone: '+244 934 567 890',
    avatar: null
  },
  {
    id: 'user-202',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@example.com',
    phone: '+351 923 456 789',
    avatar: null
  }
]

// ===== MOCK EXCHANGE RATES =====

export const mockExchangeRates = {
  'EUR/AOA': {
    rate: 650.50,
    change: +2.5,
    changePercent: +0.38,
    lastUpdated: '2024-03-10T15:00:00Z'
  },
  'AOA/EUR': {
    rate: 0.001537,
    change: -0.000006,
    changePercent: -0.38,
    lastUpdated: '2024-03-10T15:00:00Z'
  }
}

// ===== MOCK TRADING DATA =====

export const mockTradingOrders = [
  {
    id: 'order-001',
    type: 'limit',
    side: 'buy',
    baseCurrency: 'EUR',
    quoteCurrency: 'AOA',
    quantity: 100,
    price: 648.00,
    filled: 0,
    status: 'open',
    createdAt: '2024-03-10T10:30:00Z'
  },
  {
    id: 'order-002',
    type: 'market',
    side: 'sell',
    baseCurrency: 'EUR',
    quoteCurrency: 'AOA',
    quantity: 50,
    price: 650.50,
    filled: 50,
    status: 'filled',
    createdAt: '2024-03-09T14:15:00Z',
    completedAt: '2024-03-09T14:15:30Z'
  }
]

// ===== MOCK KYC DATA =====

export const mockKYCData = {
  status: 'in_progress',
  completedSteps: ['personal_info', 'contact_info'],
  currentStep: 'document_upload',
  steps: [
    { id: 'personal_info', name: 'Informações Pessoais', completed: true },
    { id: 'contact_info', name: 'Informações de Contato', completed: true },
    { id: 'document_upload', name: 'Upload de Documentos', completed: false },
    { id: 'verification', name: 'Verificação', completed: false }
  ]
}

// ===== MOCK API FUNCTIONS =====

// Simulate API delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi = {
  // User operations
  async getCurrentUser() {
    await delay()
    return { success: true, data: mockUser }
  },

  // Wallet operations
  async getWalletBalances() {
    await delay()
    return { success: true, data: mockWalletBalances }
  },

  // Transaction operations
  async getTransactionHistory(page = 1, limit = 20) {
    await delay()
    const start = (page - 1) * limit
    const end = start + limit
    return {
      success: true,
      data: {
        transactions: mockTransactions.slice(start, end),
        total: mockTransactions.length,
        page,
        limit
      }
    }
  },

  async sendMoney(data: { recipientId: string; amount: number; currency: string; description?: string }) {
    await delay(1000) // Longer delay for send operation
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'send',
      amount: data.amount,
      currency: data.currency as 'EUR' | 'AOA',
      status: 'pending',
      description: data.description || 'Transferência',
      recipientName: mockSearchUsers.find(u => u.id === data.recipientId)?.name || 'Unknown',
      createdAt: new Date().toISOString()
    }
    return { success: true, data: newTransaction }
  },

  // User search
  async searchUsers(query: string) {
    await delay(300)
    const filtered = mockSearchUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    )
    return { success: true, data: filtered }
  },

  // Exchange rates
  async getExchangeRates() {
    await delay()
    return { success: true, data: mockExchangeRates }
  },

  // Trading operations
  async getTradingOrders() {
    await delay()
    return { success: true, data: mockTradingOrders }
  },

  async placeLimitOrder(data: { side: string; baseCurrency: string; quoteCurrency: string; quantity: number; price: number }) {
    await delay(800)
    const newOrder = {
      id: `order-${Date.now()}`,
      type: 'limit',
      ...data,
      filled: 0,
      status: 'open',
      createdAt: new Date().toISOString()
    }
    return { success: true, data: newOrder }
  },

  // KYC operations
  async getKYCStatus() {
    await delay()
    return { success: true, data: mockKYCData }
  }
}

// ===== MOCK HOOKS (to replace React Query hooks) =====

export const useMockUser = () => ({
  data: mockUser,
  isLoading: false,
  error: null
})

export const useMockWallets = () => ({
  data: mockWalletBalances,
  isLoading: false,
  error: null
})

export const useMockTransactions = () => ({
  data: mockTransactions,
  isLoading: false,
  error: null
})
