# Mock UI Development Guide

This guide explains how to build UI components using mock data without connecting to the real API.

## 🎯 Overview

The mock system allows you to:
- Build and test UI components with realistic data
- Test loading and error states
- Develop without API dependencies
- Easily switch to real API when ready

## 📁 Mock System Files

```
src/
├── lib/
│   └── mock-data.ts          # Mock data definitions
├── hooks/
│   ├── use-mock-api.ts       # Mock API hooks
│   ├── use-api.ts            # Real API hooks
│   └── index.ts              # Hook switcher
└── components/
    └── examples/
        └── mock-dashboard-example.tsx  # Example component
```

## 🚀 Quick Start

### 1. Using Mock Hooks in Components

```tsx
'use client'

import { useUser, useWallets, isMockMode } from '@/hooks'

export function MyComponent() {
  const { data: user, isLoading } = useUser()
  const { data: wallets } = useWallets()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {isMockMode && <div>🧪 Mock Mode Active</div>}
      <h1>Welcome, {user?.name}!</h1>
      {/* Your UI here */}
    </div>
  )
}
```

### 2. Available Mock Hooks

```tsx
// User data
const { data: user, isLoading, error } = useUser()

// Wallet balances
const { data: wallets, isLoading, error } = useWallets()

// Transaction history
const { data: transactions, isLoading, error } = useTransactions()

// Send money
const { sendMoney, isLoading, error } = useSendMoney()

// User search
const { data: users, searchUsers, isLoading } = useUserSearch()

// Exchange rates
const { data: rates, isLoading, error } = useExchangeRates()

// Trading orders
const { data: orders, isLoading, error } = useTradingOrders()

// KYC status
const { data: kycStatus, isLoading, error } = useKYCStatus()
```

### 3. Testing Loading States

```tsx
import { useMockLoading } from '@/hooks'

export function MyComponent() {
  const isLoading = useMockLoading(2000) // 2 second loading
  
  if (isLoading) return <Skeleton />
  
  return <div>Content loaded!</div>
}
```

### 4. Testing Error States

```tsx
import { useMockError } from '@/hooks'

export function MyComponent() {
  const error = useMockError(true, 'Custom error message')
  
  if (error) return <div>Error: {error}</div>
  
  return <div>Success!</div>
}
```

## 📊 Mock Data Structure

### User Data
```tsx
{
  id: 'user-123',
  email: 'joao.silva@example.com',
  name: 'João Silva',
  phone: '+244 912 345 678',
  isVerified: true,
  kycStatus: 'approved'
}
```

### Wallet Balances
```tsx
[
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
```

### Transactions
```tsx
[
  {
    id: 'tx-001',
    type: 'send',
    amount: 125.50,
    currency: 'EUR',
    status: 'completed',
    description: 'Transferência para Maria Santos',
    recipientName: 'Maria Santos',
    createdAt: '2024-03-10T09:15:00Z'
  }
  // ... more transactions
]
```

## 🔄 Switching to Real API

When ready to connect to the real API:

1. **Change the toggle in `src/hooks/index.ts`:**
   ```tsx
   const USE_MOCK_DATA = false  // Change to false
   ```

2. **Your components don't need to change** - they'll automatically use real API hooks

3. **Test the switch:**
   ```tsx
   import { isMockMode } from '@/hooks'
   
   console.log('Mock mode:', isMockMode) // false when using real API
   ```

## 🎨 UI Development Best Practices

### 1. Build Components with Mock Data First
```tsx
// ✅ Good: Start with mock data
export function TransactionList() {
  const { data: transactions, isLoading } = useTransactions()
  
  // Build your UI with mock data
  return (
    <div>
      {transactions?.map(tx => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  )
}
```

### 2. Handle Loading States
```tsx
// ✅ Good: Always handle loading
export function WalletBalance() {
  const { data: wallets, isLoading } = useWallets()
  
  if (isLoading) return <WalletSkeleton />
  
  return <WalletDisplay wallets={wallets} />
}
```

### 3. Handle Error States
```tsx
// ✅ Good: Handle errors gracefully
export function UserProfile() {
  const { data: user, isLoading, error } = useUser()
  
  if (isLoading) return <ProfileSkeleton />
  if (error) return <ErrorMessage error={error} />
  
  return <ProfileDisplay user={user} />
}
```

### 4. Use TypeScript for Type Safety
```tsx
// ✅ Good: Import types
import type { Transaction } from '@/types'

interface TransactionCardProps {
  transaction: Transaction
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  // TypeScript will catch any type errors
  return <div>{transaction.description}</div>
}
```

## 🧪 Testing Different Scenarios

### Test with Different Data
```tsx
// Modify mock data in src/lib/mock-data.ts
export const mockUser = {
  // ... change properties to test different states
  kycStatus: 'pending', // Test pending KYC
  isVerified: false,    // Test unverified user
}
```

### Test Loading Delays
```tsx
// In src/lib/mock-data.ts
const delay = (ms: number = 2000) => // Increase delay to test loading
```

### Test Error Scenarios
```tsx
// In mock API functions
async getCurrentUser() {
  await delay()
  // Simulate error
  throw new Error('User not found')
}
```

## 📱 Example Components

Visit `/mock-ui` in your browser to see a complete example of:
- User profile display
- Wallet balance cards
- Transaction history
- Loading skeletons
- Mock mode indicator

## 🔧 Customizing Mock Data

### Add New Mock Data
```tsx
// In src/lib/mock-data.ts
export const mockNewFeature = {
  // Your new feature data
}

// In src/hooks/use-mock-api.ts
export function useNewFeature() {
  // Your new mock hook
}

// In src/hooks/index.ts
export const useNewFeature = USE_MOCK_DATA ? mockHooks.useNewFeature : realHooks.useNewFeature
```

### Simulate API Delays
```tsx
// Adjust delay in mock functions
const delay = (ms: number = 1000) => // 1 second delay
```

## 🎯 Benefits

1. **Faster Development**: No API dependency
2. **Better Testing**: Test all UI states easily
3. **Realistic Data**: Mock data matches real API structure
4. **Easy Switching**: One toggle to switch to real API
5. **Type Safety**: Full TypeScript support
6. **Loading States**: Test loading and error scenarios

## 🚀 Next Steps

1. Build your UI components using mock hooks
2. Test different states (loading, error, success)
3. Style and polish your components
4. When ready, switch `USE_MOCK_DATA` to `false`
5. Test with real API
6. Deploy!

---

**Happy UI Development!** 🎨✨
