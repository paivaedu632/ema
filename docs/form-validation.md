# EmaPay Form Validation Standard

## Overview

EmaPay uses **React Hook Form + Zod** as the official validation system for all forms throughout the application. This approach provides type-safe, performant validation with excellent user experience and maintainability.

**Status**: ✅ Official Standard (Replaces all previous custom validation)
**Libraries**: React Hook Form v7+ + Zod v3+ + @hookform/resolvers
**Implementation Date**: June 19, 2025

## Architecture

### Core Components
- **React Hook Form**: Form state management and validation orchestration
- **Zod**: TypeScript-first schema validation with static type inference
- **@hookform/resolvers/zod**: Integration bridge between React Hook Form and Zod
- **EmaPay Design System**: Consistent error styling and positioning

### Key Benefits
- ✅ Type-safe validation with full TypeScript support
- ✅ Minimal re-renders for optimal performance
- ✅ Declarative schema-based validation
- ✅ Unified error hierarchy system
- ✅ Seamless ShadCN component integration
- ✅ Professional UX with single error display

## Validation Schema Structure

### Basic Schema Pattern
```typescript
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

// Define schema with EmaPay error hierarchy
const createValidationSchema = (context: ValidationContext) => {
  return z.object({
    amount: z.string()
      .min(1, "Digite um valor")
      .transform((val) => {
        const num = Number(val)
        if (isNaN(num) || num <= 0) {
          throw new z.ZodError([{
            code: "custom",
            message: "Digite um valor válido",
            path: ["amount"]
          }])
        }
        return num
      })
      // Priority 1: Transaction limits (highest priority)
      .refine((val) => val >= context.limits.min, {
        message: `Valor mínimo: ${context.limits.min.toLocaleString()} ${context.currency}`
      })
      .refine((val) => val <= context.limits.max, {
        message: `Valor máximo: ${context.limits.max.toLocaleString()} ${context.currency}`
      })
      // Priority 2: Balance validation
      .refine((val) => val <= context.availableBalance, {
        message: "Seu saldo não é suficiente"
      }),
    currency: z.enum(["EUR", "AOA"])
  })
}

type FormData = z.infer<ReturnType<typeof createValidationSchema>>
```

### Form Implementation
```typescript
export function EmapayForm() {
  // Setup form with dynamic schema
  const form = useForm<FormData>({
    resolver: zodResolver(createValidationSchema(validationContext)),
    mode: "onChange", // Immediate validation
    defaultValues: {
      amount: "",
      currency: "EUR"
    }
  })

  const { watch, setValue, formState: { errors, isValid } } = form
  
  // Update schema when context changes
  useEffect(() => {
    const newSchema = createValidationSchema(updatedContext)
    form.clearErrors()
    if (watchedAmount) {
      form.trigger("amount")
    }
  }, [validationContext, form])

  return (
    <form>
      <AmountInput
        amount={watch("amount")}
        currency={watch("currency")}
        onAmountChange={(value) => setValue("amount", value)}
        onCurrencyChange={(value) => setValue("currency", value)}
        showValidation={false} // Disable internal validation
      />
      
      {/* Error display following EmaPay standards */}
      {errors.amount?.message && (
        <p className="form-error-ema">{errors.amount.message}</p>
      )}
      
      <AvailableBalance amount={getFormattedBalance()} />
    </form>
  )
}
```

## Error Hierarchy System

EmaPay follows a strict error priority system to ensure users see the most relevant validation message:

### Priority Order (Highest to Lowest)
1. **Transaction Limits**: Min/max amount validation
2. **Balance Validation**: Insufficient funds checking  
3. **Format Validation**: Invalid input format
4. **Other Validation**: Additional business rules

### Implementation
```typescript
// Zod automatically handles priority through refinement order
const schema = z.object({
  amount: z.string()
    .min(1, "Digite um valor")                    // Priority 4: Format
    .transform(parseNumber)                       // Transform to number
    .refine(checkMinLimit, { message: "..." })    // Priority 1: Min limit
    .refine(checkMaxLimit, { message: "..." })    // Priority 1: Max limit  
    .refine(checkBalance, { message: "..." })     // Priority 2: Balance
})
```

## Error Message Standards

### Portuguese Messages
- **Insufficient Balance**: "Seu saldo não é suficiente"
- **Transaction Limits**: "Valor máximo: 10,000 EUR" / "Valor mínimo: 1,000 AOA"
- **Invalid Input**: "Digite um valor válido"
- **Required Field**: "Digite um valor"

### Error Positioning
- ✅ **Below input fields**: Immediately after the input component
- ✅ **Above balance displays**: Before balance/status information
- ✅ **Single error display**: Only show highest priority error
- ✅ **Consistent spacing**: Use `.form-error-ema` class

## Design System Integration

### CSS Classes
```css
.form-error-ema {
  @apply text-red-700 text-sm mt-1;
}
```

### Component Structure
```jsx
<div className="form-field">
  <AmountInput {...props} className="mb-3" />
  
  {/* Error message positioned here */}
  {errors.amount?.message && (
    <p className="form-error-ema">{errors.amount.message}</p>
  )}
  
  {/* Balance display below error */}
  <AvailableBalance amount={balance} />
</div>
```

## Migration Guide

### Deprecated Approaches
- ❌ Custom `validateAmount()` functions
- ❌ Multiple error state variables (`validationError`, `limitError`, etc.)
- ❌ Manual error hierarchy management
- ❌ `AmountInput` internal validation (`showValidation={true}`)
- ❌ Multiple error display elements

### Migration Steps
1. **Install dependencies**: `npm install react-hook-form @hookform/resolvers zod`
2. **Replace custom validation** with Zod schemas
3. **Update form state** to use `useForm` hook
4. **Consolidate error display** to single element with `.form-error-ema`
5. **Update component props** to use form `setValue` and `watch`
6. **Test validation hierarchy** with different input scenarios

## Best Practices

### Schema Design
- ✅ Use dynamic schemas for context-dependent validation
- ✅ Implement proper error hierarchy through refinement order
- ✅ Include Portuguese error messages
- ✅ Use TypeScript for full type safety

### Performance
- ✅ Use `mode: "onChange"` for immediate feedback
- ✅ Debounce expensive validations when needed
- ✅ Clear errors before schema updates
- ✅ Trigger validation after context changes

### User Experience
- ✅ Show only one error at a time
- ✅ Position errors consistently below inputs
- ✅ Use clear, actionable Portuguese messages
- ✅ Maintain EmaPay's clean, minimal design

## Examples

### Send Money Validation
See `src/components/send.tsx` for the complete implementation of React Hook Form + Zod validation in the send money flow.

### Buy/Sell Validation
Similar patterns should be applied to buy and sell flows with appropriate transaction limits and balance checks.

---

**Last Updated**: June 19, 2025
**Status**: ✅ Official Standard
**Replaces**: All previous custom validation approaches
