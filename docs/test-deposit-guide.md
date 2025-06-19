# Test Deposit Endpoint Guide

## Overview

The `/api/test-deposit` endpoint is a **temporary testing endpoint** designed to simulate deposit functionality for testing EmaPay's buy, sell, and send operations. This endpoint allows developers to add money to user wallets without implementing actual payment gateway integration.

⚠️ **Important**: This endpoint is for testing purposes only and will be replaced with actual payment gateway integration in production.

## Endpoint Details

- **URL**: `POST /api/test-deposit`
- **Authentication**: Clerk JWT required
- **Content-Type**: `application/json`

## Request Format

```json
{
  "amount": 100.50,
  "currency": "EUR"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | Yes | Positive number representing the amount to deposit |
| `currency` | string | Yes | Currency code - must be "AOA" or "EUR" |

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Depósito de teste processado com sucesso",
  "data": {
    "wallet": {
      "currency": "EUR",
      "balance": 200.00,
      "available_balance": 200.00,
      "last_updated": "2025-06-19T10:30:00.000Z"
    },
    "deposit": {
      "amount": 100.00,
      "currency": "EUR",
      "timestamp": "2025-06-19T10:30:00.000Z"
    }
  },
  "timestamp": "2025-06-19T10:30:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid amount. Must be a positive number."
}
```

```json
{
  "success": false,
  "error": "Invalid currency. Must be AOA or EUR."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "details": "Database connection failed",
  "timestamp": "2025-06-19T10:30:00.000Z"
}
```

## Usage Examples

### Using cURL

```bash
# Add 100 EUR to wallet
curl -X POST http://localhost:3000/api/test-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{"amount": 100.50, "currency": "EUR"}'

# Add 85000 AOA to wallet
curl -X POST http://localhost:3000/api/test-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{"amount": 85000, "currency": "AOA"}'
```

### Using JavaScript/Fetch

```javascript
async function addTestDeposit(amount, currency) {
  try {
    const response = await fetch('/api/test-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Deposit successful:', result.data);
      return result.data;
    } else {
      console.error('Deposit failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error making deposit:', error);
    throw error;
  }
}

// Usage
addTestDeposit(100.50, 'EUR')
  .then(data => console.log('New balance:', data.wallet.balance))
  .catch(error => console.error('Failed:', error));
```

## Testing Workflow

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Login to the application** in your browser to get authenticated

3. **Add test funds** using the endpoint:
   ```bash
   # Add EUR for testing buy operations (EUR → AOA)
   curl -X POST http://localhost:3000/api/test-deposit \
     -H "Content-Type: application/json" \
     -d '{"amount": 500, "currency": "EUR"}'

   # Add AOA for testing sell operations (AOA → EUR)
   curl -X POST http://localhost:3000/api/test-deposit \
     -H "Content-Type: application/json" \
     -d '{"amount": 100000, "currency": "AOA"}'
   ```

4. **Test transaction operations**:
   - Use `/api/transactions/buy` to test EUR → AOA conversion
   - Use `/api/transactions/sell` to test AOA → EUR conversion
   - Use `/api/transactions/send` to test money transfers

## Database Impact

The endpoint performs the following database operations:

1. **Wallet Management**:
   - Creates a new wallet if one doesn't exist for the currency
   - Updates existing wallet balances (`balance` and `available_balance`)
   - Sets `updated_at` timestamp

2. **Transaction Recording**:
   - Creates a transaction record with type `'deposit'`
   - Marks status as `'completed'`
   - Includes metadata indicating it's a test deposit

## Security Considerations

- ✅ Requires Clerk authentication
- ✅ Validates input parameters
- ✅ Uses server-side Supabase admin client
- ✅ Follows existing EmaPay API patterns
- ⚠️ **Should be removed in production**

## Validation Rules

- Amount must be a positive number
- Currency must be exactly "AOA" or "EUR" (case-insensitive)
- User must exist in the database
- User must be authenticated via Clerk

## Testing Script

A comprehensive test script is available at `scripts/test-deposit-endpoint.js`:

```bash
# Set your auth token and run tests
AUTH_TOKEN=your_clerk_token node scripts/test-deposit-endpoint.js
```

## Removal Checklist

Before production deployment, ensure:

- [ ] Remove `/api/test-deposit` endpoint
- [ ] Remove test script `scripts/test-deposit-endpoint.js`
- [ ] Remove this documentation file
- [ ] Implement actual payment gateway integration
- [ ] Update API documentation to remove test endpoint references
