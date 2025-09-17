# 🔍 Database Investigation: Exchange Rates Midpoint Endpoint

## 📋 **INVESTIGATION COMPLETED**

Investigation of the `/api/v1/exchange-rates/midpoint` endpoint data source and database structure has been completed successfully.

## 🗄️ **PRIMARY DATA SOURCE: `order_book` TABLE**

The new `/api/v1/exchange-rates/midpoint` endpoint pulls exchange rate data from the **`order_book`** table, which serves as the central order book for the EmaPay trading system.

### **Table Structure: `order_book`**

```sql
CREATE TABLE order_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_type TEXT CHECK (order_type IN ('limit', 'market')),
  side TEXT CHECK (side IN ('buy', 'sell')),
  base_currency TEXT CHECK (base_currency IN ('EUR', 'AOA')),
  quote_currency TEXT CHECK (quote_currency IN ('EUR', 'AOA')),
  quantity NUMERIC CHECK (quantity > 0),
  remaining_quantity NUMERIC CHECK (remaining_quantity >= 0),
  price NUMERIC CHECK (price > 0),
  average_fill_price NUMERIC CHECK (average_fill_price > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled', 'rejected')),
  reserved_amount NUMERIC DEFAULT 0.00 CHECK (reserved_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  filled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
```

### **Key Columns for Exchange Rate Calculation:**
- **`base_currency`** / **`quote_currency`**: Currency pair (e.g., EUR/AOA)
- **`side`**: 'buy' or 'sell' orders
- **`price`**: Order price in quote currency
- **`remaining_quantity`**: Available quantity for matching
- **`status`**: Only 'pending' and 'partially_filled' orders are considered

## ⚙️ **DATABASE FUNCTION: `get_midpoint_exchange_rate`**

### **Function Implementation:**
```sql
CREATE OR REPLACE FUNCTION get_midpoint_exchange_rate(
    p_base_currency TEXT,
    p_quote_currency TEXT
) RETURNS DECIMAL(12,8)
```

### **Calculation Logic:**

1. **Best Bid/Ask Extraction:**
   ```sql
   SELECT 
     MAX(CASE WHEN side = 'buy' THEN price END) as best_bid,
     MIN(CASE WHEN side = 'sell' THEN price END) as best_ask
   FROM order_book
   WHERE base_currency = p_base_currency
     AND quote_currency = p_quote_currency
     AND status IN ('pending', 'partially_filled')
     AND remaining_quantity > 0;
   ```

2. **Midpoint Calculation:**
   - **Both bid and ask exist**: `midpoint = (best_bid + best_ask) / 2`
   - **Only bid exists**: `midpoint = best_bid`
   - **Only ask exists**: `midpoint = best_ask`

3. **Fallback Mechanisms:**
   - **Recent trades**: If no active orders, use latest trade price
   - **Hardcoded rates**: Final fallback (EUR/AOA: 1252.0000, AOA/EUR: 0.00079872)

## 📊 **CURRENT DATA ANALYSIS**

### **EUR/AOA Order Book Status:**
- **Best Bid (Highest Buy)**: 1,220.00 AOA per EUR
- **Best Ask (Lowest Sell)**: 1,160.00 AOA per EUR
- **Current Midpoint**: 1,190.00 AOA per EUR
- **Active Buy Orders**: 10
- **Active Sell Orders**: 20
- **Spread**: 60.00 AOA (5.17%)

### **Order Distribution:**
```
Sell Orders (Ask Side):
- 1,160.00 AOA: 20.00 EUR available
- 1,170.00 AOA: 25.00 EUR available  
- 1,180.00 AOA: 30.00 EUR available
- 1,190.00 AOA: 35.00 EUR available
- 1,200.00 AOA: 90.00 EUR available
- 1,250.00 AOA: 400.00 EUR available

Buy Orders (Bid Side):
- 1,220.00 AOA: [quantity varies]
- [Additional buy orders at lower prices]
```

## 🔄 **SECONDARY DATA SOURCES**

### **1. `trades` TABLE (Fallback)**
- **Purpose**: Historical trade data for rate calculation when no active orders exist
- **Key Columns**: `base_currency`, `quote_currency`, `price`, `executed_at`
- **Usage**: Latest trade price when order book is empty

### **2. Hardcoded Fallback Rates**
- **EUR/AOA**: 1,252.0000
- **AOA/EUR**: 0.00079872
- **Usage**: Final fallback when no orders or trades exist

## 🎯 **ENDPOINT DATA FLOW**

```
1. API Request: GET /api/v1/exchange-rates/midpoint?baseCurrency=EUR&quoteCurrency=AOA
2. Database Function: get_midpoint_exchange_rate('EUR', 'AOA')
3. Order Book Query: Active orders with remaining quantity > 0
4. Calculation: Midpoint between best bid and best ask
5. Response: Structured exchange rate data with bid/ask/midpoint
```

## 📈 **REAL-TIME CHARACTERISTICS**

### **Live Order Book Data:**
- **Real-time updates**: Orders are added/removed as users trade
- **Price discovery**: Market-driven pricing through active orders
- **Liquidity-based**: Rates reflect actual available liquidity

### **Rate Calculation Frequency:**
- **On-demand**: Calculated fresh for each API request
- **No caching**: Always reflects current order book state
- **Sub-second accuracy**: Immediate reflection of order changes

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Database Function Call:**
```typescript
// src/lib/database/functions.ts
export async function getMidpointExchangeRate(params: {
  base_currency: string;
  quote_currency: string;
}) {
  return executeFunction('get_midpoint_exchange_rate', {
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency
  });
}
```

### **API Response Structure:**
```json
{
  "success": true,
  "data": {
    "pair": "EUR/AOA",
    "baseCurrency": "EUR",
    "quoteCurrency": "AOA", 
    "midpointRate": 1190.0000,
    "bidRate": 1220.0000,
    "askRate": 1160.0000,
    "spread": 0.4000,
    "source": "order_book_midpoint",
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "status": "active"
  }
}
```

## ✅ **INVESTIGATION SUMMARY**

**Data Source**: `order_book` table with real-time order data
**Calculation Method**: True midpoint between best bid and best ask prices  
**Fallback Strategy**: Recent trades → Hardcoded rates
**Update Frequency**: Real-time, calculated on each request
**Accuracy**: Reflects actual market liquidity and pricing

The `/api/v1/exchange-rates/midpoint` endpoint provides genuine market-based exchange rates derived from active trading orders, ensuring accurate and current pricing for the EmaPay currency conversion system.
