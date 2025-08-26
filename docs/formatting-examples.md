# EmaPay Portuguese Locale Formatting Examples

## 🎯 Scope Clarification

**Portuguese locale formatting (1.234,56) is for FRONTEND DISPLAY ONLY**

### ✅ Frontend Components (Use Portuguese Formatting)
- Balance cards, transaction lists, forms, confirmation screens
- All user-facing currency displays
- Input field formatting and validation

### ❌ Backend/API (Use Standard JSON Format)
- API requests/responses, database operations
- All backend calculations and storage
- JSON data interchange

## 📋 Function Usage Examples

### Frontend Display Functions

```typescript
import { formatAmountWithCurrency, formatAmountForInput } from '@/lib/format'

// ✅ CORRECT: Frontend display
const balanceDisplay = formatAmountWithCurrency(1250.50, 'EUR')
// Result: "1.250,50 EUR"

const inputDisplay = formatAmountForInput(125000.75, 'AOA') 
// Result: "125.000,75"
```

### API Conversion Functions

```typescript
import { formatForAPI, parsePortugueseNumber } from '@/lib/format'

// ✅ CORRECT: Convert user input to API format
const userInput = "1.250,50" // Portuguese formatted input
const apiAmount = formatForAPI(userInput)
// Result: "1250.50" (standard decimal for API)

// ✅ CORRECT: Parse Portuguese input to number
const numericValue = parsePortugueseNumber("125.000,75")
// Result: 125000.75 (for calculations)
```

## 🏗️ Component Implementation Examples

### Balance Card Component
```typescript
// ✅ CORRECT: Display formatting only
export function BalanceCard({ amount, currency }) {
  return (
    <div>
      <p>{formatAmountForInput(amount, currency)}</p>
    </div>
  )
}
```

### API Call Example
```typescript
// ✅ CORRECT: Convert to standard format for API
async function submitTransaction(userAmount: string, currency: string) {
  const apiAmount = formatForAPI(userAmount) // Convert Portuguese to standard
  
  const response = await fetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      amount: parseFloat(apiAmount), // Send as number
      currency: currency
    })
  })
}
```

### Form Handling Example
```typescript
// ✅ CORRECT: Display Portuguese, send standard format
function TransactionForm() {
  const [displayAmount, setDisplayAmount] = useState('')
  
  const handleSubmit = async () => {
    // Convert Portuguese formatted input to API format
    const apiAmount = formatForAPI(displayAmount)
    
    await submitTransaction(apiAmount, currency)
  }
  
  return (
    <input 
      value={displayAmount}
      placeholder="1.250,50" // Show Portuguese format to user
      onChange={(e) => setDisplayAmount(e.target.value)}
    />
  )
}
```

## 📊 Formatting Examples

| Input | Frontend Display | API Format | Usage |
|-------|------------------|------------|-------|
| `1250.50` | `1.250,50 EUR` | `"1250.50"` | Balance display → API call |
| `"1.250,50"` | `1.250,50` | `"1250.50"` | User input → API submission |
| `125000.75` | `125.000,75 AOA` | `"125000.75"` | Database value → Display |

## ⚠️ Common Mistakes to Avoid

### ❌ WRONG: Using Portuguese formatting in API calls
```typescript
// DON'T DO THIS
const response = await fetch('/api/transactions', {
  body: JSON.stringify({
    amount: "1.250,50" // ❌ Portuguese format in API
  })
})
```

### ✅ CORRECT: Use standard format for API
```typescript
// DO THIS INSTEAD
const apiAmount = formatForAPI("1.250,50")
const response = await fetch('/api/transactions', {
  body: JSON.stringify({
    amount: parseFloat(apiAmount) // ✅ Standard decimal format
  })
})
```

### ❌ WRONG: Storing formatted strings in database
```typescript
// DON'T DO THIS
await supabase.from('transactions').insert({
  amount: "1.250,50" // ❌ Formatted string in database
})
```

### ✅ CORRECT: Store raw numbers in database
```typescript
// DO THIS INSTEAD
const numericAmount = parsePortugueseNumber("1.250,50")
await supabase.from('transactions').insert({
  amount: numericAmount // ✅ Raw number in database
})
```

## 🔄 Data Flow Pattern

```
User Input (Portuguese) → Parse → Calculate → Store (Standard) → Retrieve → Display (Portuguese)
     ↓                     ↓         ↓          ↓              ↓           ↓
  "1.250,50"         →   1250.50  →  calc   →  1250.50    →  1250.50  →  "1.250,50 EUR"
```

## 📝 Best Practices

1. **Frontend Components**: Always use `formatAmountWithCurrency()` or `formatAmountForInput()`
2. **API Calls**: Always use `formatForAPI()` to convert user input
3. **Database Operations**: Work with raw numeric values only
4. **Form Validation**: Use `parsePortugueseNumber()` to validate user input
5. **JSON Responses**: Return standard numbers, format on frontend

This ensures user-friendly Portuguese display while maintaining standard data interchange formats for backend systems.
