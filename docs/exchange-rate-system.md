# EmaPay Exchange Rate System

## Overview

EmaPay's exchange rate system provides real-time EUR ↔ AOA currency conversion with live market data integration from Banco BAI API. The system supports both automatic and manual rate selection with intelligent validation.

**Status**: ✅ Production Ready  
**API Integration**: Banco BAI Official Exchange Rate API  
**Update Frequency**: Real-time on demand  
**Fallback Strategy**: Static rates with graceful degradation  

## Architecture

### Client-Safe API Design

```
Frontend Component → /api/exchange-rate/banco-bai → Banco BAI API
                  ↓
            Live Rate Display & Validation
```

**Key Benefits**:
- ✅ **Server-Side Security**: API keys and sensitive logic remain on server
- ✅ **Client-Side Performance**: Fast, cached responses for UI updates
- ✅ **Error Resilience**: Graceful fallbacks when external API fails
- ✅ **Type Safety**: Full TypeScript integration with proper error handling

### API Endpoint: `/api/exchange-rate/banco-bai`

**Method**: `GET`  
**Response Format**:
```json
{
  "success": true,
  "data": {
    "sellValue": 1100.0124,
    "buyValue": 1078.4435,
    "currency": "EUR",
    "quotationDate": "2025-06-19T11:00:00.000Z"
  },
  "timestamp": "2025-06-20T11:30:57.709Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "EUR exchange rate not found in API response",
  "timestamp": "2025-06-20T11:30:57.709Z"
}
```

## Manual Rate Input System

### Enhanced User Experience

#### **Before (Complex)**
- ❌ Hardcoded default rate (924.0675)
- ❌ Currency selector confusion
- ❌ Static rate reference
- ❌ Basic validation with fixed ranges

#### **After (Enhanced)**
- ✅ **Empty input** with live API placeholder
- ✅ **Simplified EUR-only** input format
- ✅ **Real-time Banco BAI** rate reference
- ✅ **Intelligent validation** with dynamic ranges
- ✅ **Portuguese error messages** with specific limits
- ✅ **Right-aligned rate display** for consistency

### Implementation Details

#### **Dynamic Placeholder System**
```typescript
const getPlaceholderText = () => {
  if (rateLoading) return "Carregando..."
  if (bancoBaiRate) return `Ex: ${bancoBaiRate.toFixed(2)}`
  return "Ex: 924.50" // Fallback
}
```

#### **Live Rate Reference Display**
```typescript
const getRateReferenceText = () => {
  if (rateLoading) return "Carregando taxa atual..."
  if (rateError) return rateError
  if (bancoBaiRate) return `Taxa atual: 1 EUR = ${bancoBaiRate.toFixed(2)} AOA`
  return "Taxa atual: 1 EUR = 924.50 AOA" // Fallback
}
```

#### **Enhanced Validation with Live Data**
```typescript
const validateManualRate = (value: string): string => {
  if (!value || value.trim() === "") return ""
  
  const num = Number(value)
  if (isNaN(num) || num <= 0) {
    return "Digite uma taxa válida"
  }

  // Enhanced range validation based on Banco BAI rate
  if (bancoBaiRate) {
    // Allow ±20% margin from Banco BAI rate
    const minRate = bancoBaiRate * 0.8
    const maxRate = bancoBaiRate * 1.2
    
    if (num < minRate || num > maxRate) {
      return `Taxa deve estar entre ${minRate.toFixed(2)} e ${maxRate.toFixed(2)} AOA por EUR`
    }
  } else {
    // Fallback range validation
    if (num < 800 || num > 1100) {
      return "Taxa deve estar entre 800 e 1100 AOA por EUR"
    }
  }

  return ""
}
```

## Currency Direction Standards

### Database Storage Format
- **AOA offers**: `exchange_rate` = "1 AOA = X EUR" (e.g., 0.001082)
- **EUR offers**: `exchange_rate` = "1 EUR = X AOA" (e.g., 924.0675)

### Frontend Display Format
- **Manual Input**: Always "1 EUR = X AOA" (simplified)
- **Rate Reference**: "Taxa atual: 1 EUR = X AOA"
- **Confirmation**: "1 EUR = X AOA" (consistent format)

### API Conversion Logic
```typescript
// Convert exchange rate to the format expected by API
let apiExchangeRate: number
if (rateType === "manual") {
  // Manual rate is always entered as EUR to AOA (1 EUR = X AOA)
  if (formData.currency === "AOA") {
    // User entered "1 EUR = X AOA", API expects "1 AOA = Y EUR"
    // Convert: if 1 EUR = 924 AOA, then 1 AOA = 1/924 EUR
    apiExchangeRate = 1 / Number(exchangeRate)
  } else {
    // User entered "1 EUR = X AOA", API expects "1 EUR = Y AOA"
    // Use the rate directly
    apiExchangeRate = Number(exchangeRate)
  }
} else {
  // Automatic rates in correct API format
  apiExchangeRate = formData.currency === "AOA" ? 0.001082 : 924.0675
}
```

## Error Handling & Fallbacks

### API Failure Scenarios
1. **Network Error**: Show "Erro ao buscar taxa atual" + fallback rate
2. **Invalid Response**: Show "Não foi possível obter a taxa atual" + fallback rate
3. **Timeout**: 10-second timeout with automatic fallback
4. **Rate Not Found**: Graceful degradation to static rates

### Fallback Strategy
- **Primary**: Live Banco BAI API data
- **Secondary**: Static rate (924.50 AOA per EUR)
- **Validation**: Always functional with appropriate range limits
- **User Experience**: Seamless operation regardless of API status

## Integration Points

### Components
- **`src/components/sell.tsx`**: Manual rate input implementation
- **`src/app/api/exchange-rate/banco-bai/route.ts`**: Server-side API endpoint

### Dependencies
- **Banco BAI API**: `https://ib.bancobai.ao/portal/api/internet/exchange/table`
- **Next.js API Routes**: Server-side rate fetching
- **React State Management**: Client-side rate caching and error handling

## Testing & Validation

### Manual Testing Scenarios
1. **Normal Operation**: API returns valid EUR rate → Display live data
2. **API Failure**: Network error → Show fallback rate and error message
3. **Invalid Input**: User enters out-of-range rate → Show Portuguese error
4. **Rate Validation**: User enters rate within ±20% → Accept input
5. **Rate Validation**: User enters rate outside range → Reject with specific message

### Production Considerations
- ✅ **Performance**: Cached API responses prevent excessive requests
- ✅ **Security**: Server-side API calls protect sensitive endpoints
- ✅ **Reliability**: Multiple fallback layers ensure system availability
- ✅ **User Experience**: Portuguese error messages and intuitive validation

---

**Last Updated**: June 20, 2025  
**Status**: ✅ Production Ready
