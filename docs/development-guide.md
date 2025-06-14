# EmaPay Database Integration Guide

## Current Status

✅ **Database Deployed**: All tables, RLS policies, and functions are live
✅ **UI Components**: Complete dashboard and transaction flows exist
🔄 **Integration Needed**: Connect UI components to database

## Prerequisites

- Node.js 18+
- EmaPay repository cloned and dependencies installed
- Supabase project deployed (kjqcfedvilcnwzfjlqtq)
- Clerk authentication configured
- AWS services configured

## Quick Start

1. **Verify database connection**
```bash
npm run dev
# Visit http://localhost:3000/api/test-db
# Should return: {"success": true, "message": "Database connection and tests successful!"}
```

2. **Check existing UI components**
```bash
# Dashboard with mock data
http://localhost:3000/dashboard

# Transaction flows with mock data
http://localhost:3000/buy
http://localhost:3000/sell
http://localhost:3000/send
```

3. **Review database types**
```bash
# Auto-generated types are ready
cat src/types/database.types.ts
cat src/lib/supabase.ts
```

## Database Integration Priorities

### Phase 1: User Registration & Wallet Setup

**Goal**: Connect Clerk user creation to database

**Current State**:
- ✅ Clerk authentication works
- ❌ New users not saved to database
- ❌ Wallets not created for new users

**Implementation**:
```typescript
// 1. Create webhook endpoint: src/app/api/webhooks/clerk/route.ts
export async function POST(request: NextRequest) {
  const { type, data } = await request.json()

  if (type === 'user.created') {
    // Create user in Supabase
    await supabaseAdmin.from('users').insert({
      clerk_user_id: data.id,
      email: data.email_addresses[0].email_address,
      full_name: data.first_name + ' ' + data.last_name
    })

    // Create AOA and EUR wallets
    await supabaseAdmin.from('wallets').insert([
      { user_id: userId, currency: 'AOA', balance: 0 },
      { user_id: userId, currency: 'EUR', balance: 0 }
    ])
  }
}
```

### Phase 2: Dashboard Data Integration

**Goal**: Replace mock data with real database queries

**Current State**:
- ✅ Dashboard UI complete (`src/components/dashboard.tsx`)
- ❌ Shows hardcoded balances (100 AOA, 50 EUR)
- ❌ Shows mock transaction history

**Implementation**:
```typescript
// 2. Update dashboard component
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { getUserWallets, getUserTransactions } from '@/lib/supabase'

export function Dashboard() {
  const { user } = useUser()
  const [wallets, setWallets] = useState([])
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    if (user) {
      // Replace mock data with real queries
      getUserWallets(user.id).then(({ data }) => setWallets(data))
      getUserTransactions(user.id).then(({ data }) => setTransactions(data))
    }
  }, [user])

  // Rest of component uses real data
}
```

### Phase 3: Transaction Processing

**Goal**: Make buy/sell flows create real database transactions

**Current State**:
- ✅ Complete buy/sell UI (`src/components/buy.tsx`, `src/components/sell.tsx`)
- ❌ No database persistence
- ❌ No balance updates

**Implementation**:
```typescript
// 3. Use Supabase RPC for atomic transactions
const handleBuyTransaction = async (eurAmount: number) => {
  const { data, error } = await supabase.rpc('process_buy_transaction', {
    p_user_id: userId,
    p_eur_amount: eurAmount,
    p_exchange_rate: 850.00
  })

  if (error) throw error

  // Transaction completed atomically
  // UI updates automatically via real-time subscriptions
}
```

## Database Integration Patterns

### 1. Replace Mock Data Pattern
```typescript
// Before (mock data)
const accounts = [
  { currency: 'AOA', amount: '100' },
  { currency: 'EUR', amount: '50' }
]

// After (real data)
const { data: accounts } = await supabase
  .from('wallets')
  .select('currency, balance')
  .eq('user_id', userId)
```

### 2. Error Handling Pattern
```typescript
// Always add proper error handling
try {
  const { data, error } = await supabase.from('users').select('*')
  if (error) throw error
  return data
} catch (error) {
  console.error('Database error:', error)
  // Show user-friendly error message
}
```

### 3. Real-time Updates Pattern
```typescript
// Add subscriptions for live data
useEffect(() => {
  const subscription = supabase
    .from('wallets')
    .on('UPDATE', (payload) => {
      setWallets(prev => prev.map(w =>
        w.id === payload.new.id ? payload.new : w
      ))
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

### Naming Conventions

#### Files and Folders
- **Components**: PascalCase (`UserProfile.tsx`)
- **Pages**: kebab-case (`user-profile/page.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: camelCase with `.types.ts` suffix

#### Variables and Functions
- **Variables**: camelCase (`userName`, `isLoading`)
- **Functions**: camelCase (`getUserBalance`, `formatCurrency`)
- **Constants**: UPPER_SNAKE_CASE (`TRANSACTION_FEE`, `API_BASE_URL`)
- **Components**: PascalCase (`UserProfile`, `TransactionCard`)

#### Database
- **Tables**: snake_case (`user_profiles`, `kyc_records`)
- **Columns**: snake_case (`full_name`, `created_at`)
- **Functions**: snake_case (`get_user_balance`)

### Component Development

#### ShadCN/UI Components
Always use ShadCN components where applicable:

```bash
# Add new ShadCN component
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add input
```

Update `ShadCN-context.md` when adding new components.

#### EmaPay Design System
Follow EmaPay's design principles:
- Clean, minimalistic design
- White backgrounds with grey cards
- Black primary buttons (h-12, rounded-full)
- Form inputs with black borders (h-10, border-black)
- No shadows except on focus states

#### Component Structure
```typescript
// components/TransactionCard.tsx
import { Transaction } from '@/types/emapay.types'
import { formatCurrency } from '@/lib/utils'

interface TransactionCardProps {
  transaction: Transaction
  onClick?: () => void
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  return (
    <div 
      className="bg-white p-4 rounded-lg cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      {/* Component content */}
    </div>
  )
}
```

### Database Development

#### Type Generation
Regenerate types after schema changes:
```bash
npx supabase gen types typescript --project-id kjqcfedvilcnwzfjlqtq --schema public > src/types/database.types.ts
```

#### Database Operations
Use type-safe database operations:

```typescript
import { supabase, getUserBalance } from '@/lib/supabase'

// Using helper functions (recommended)
const { data: balance } = await getUserBalance(userId, 'EUR')

// Direct queries (when needed)
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

#### Server-Side Operations
Use server client for admin operations:

```typescript
import { supabaseAdmin, createTransaction } from '@/lib/supabase-server'

// In API routes or server actions
const { data: transaction } = await createTransaction({
  user_id: userId,
  type: 'buy',
  amount: 100.00,
  currency: 'EUR',
  fee_amount: 2.00,
  net_amount: 98.00
})
```

### API Development

#### Route Structure
```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // API logic here
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Error Handling
Consistent error responses:

```typescript
// lib/api-utils.ts
export function createErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}
```

### Form Development

#### Form Validation
Use Zod for validation:

```typescript
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['AOA', 'EUR']),
  recipient_email: z.string().email('Invalid email')
})

type TransactionForm = z.infer<typeof transactionSchema>
```

#### Form Components
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function TransactionForm() {
  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      currency: 'EUR'
    }
  })

  const onSubmit = async (data: TransactionForm) => {
    // Handle form submission
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### Testing Strategy

#### Manual Testing
EmaPay uses manual testing approach:
- Test all user flows manually
- Focus on UI/UX validation
- Verify business logic correctness

#### Database Testing
```bash
# Test database connection
curl http://localhost:3000/api/test-db
```

#### Component Testing
- Test components in isolation
- Verify responsive design
- Check accessibility compliance

### Performance Optimization

#### Database Queries
- Use indexes for frequently queried columns
- Implement pagination for large datasets
- Use database functions for complex operations

#### Frontend Performance
- Lazy load components when possible
- Optimize images and assets
- Use React.memo for expensive components

#### Caching Strategy
- Cache exchange rates (static data)
- Cache user profile data
- Implement optimistic updates

### Security Best Practices

#### Authentication
- Always verify Clerk session tokens
- Use RLS policies for data access
- Never expose service keys in client code

#### Data Validation
- Validate all inputs on both client and server
- Sanitize user inputs
- Use TypeScript for type safety

#### API Security
- Implement rate limiting
- Use HTTPS in production
- Validate request origins

### Deployment

#### Environment Setup
```bash
# Production environment variables
NEXT_PUBLIC_APP_URL=https://emapay.com
NODE_ENV=production
```

#### Build Process
```bash
npm run build
npm run start
```

#### Database Migrations
```bash
# Deploy migrations to production
npx supabase db push --project-ref kjqcfedvilcnwzfjlqtq
```

### Debugging

#### Common Issues
1. **Database connection errors**: Check environment variables
2. **Authentication failures**: Verify Clerk configuration
3. **Type errors**: Regenerate database types
4. **Build failures**: Check for unused imports

#### Debugging Tools
- Browser DevTools
- Supabase Dashboard
- Clerk Dashboard
- AWS CloudWatch (for S3 operations)

### Code Quality

#### Linting
```bash
npm run lint
```

#### Formatting
Use Prettier for consistent formatting:
```bash
npx prettier --write .
```

#### TypeScript
- Enable strict mode
- Use proper type annotations
- Avoid `any` types

### Git Workflow

#### Branch Naming
- `feature/user-registration`
- `fix/transaction-validation`
- `docs/api-reference`

#### Commit Messages
```
feat: add user registration flow
fix: resolve transaction validation bug
docs: update API documentation
```

#### Pull Requests
- Include description of changes
- Test all functionality
- Update documentation if needed

---

**Last Updated**: June 14, 2025  
**Development Guide Version**: 1.0.0
