After carefull consideration, I have decided to replace VWAP with mid-market pricing to help users enter the right received amount when placing limit orders.

I asked Ai to analyse the database schema and API to understand the current VWAP implementation and create a detailed plan for migrating to mid-market pricing. He obsviously did not understand the requirements and suggested a bunch things we dont need. Therefore is your job to provide the necessary instructions based on the analysis below:

I'll analyze the database schema and API to understand the current VWAP implementation and create a detailed plan for migrating to mid-market pricing. Let me start by examining the Supabase database structure.

Let me first get the project information to identify the correct project ID:

Now let me examine the database schema:

Now let me search for any existing VWAP-related code in the codebase:

Now let me search for any existing API endpoints related to exchange rates or pricing:

Now let me check if there are any existing database functions related to market data or exchange rates:

Let me check for more functions related to pricing and VWAP:

Let me check what functions are actually available in the database:

Let me examine the `get_market_summary` function more closely since it mentions VWAP:

Now let me check if there are any views related to market data:

Let me check the structure of the market-related views:

Now let me check if there's an existing mid-price endpoint directory:

Let me check what's in the mid-price directory:

Based on my analysis, I can now create a comprehensive plan for replacing VWAP with mid-market rate. Here's what I found:

## **Analysis Summary**

### **Current State:**
1. **No VWAP Implementation Found**: Despite references in backup files, there's no active VWAP calculation in the current database or API
2. **Existing Infrastructure**: 
   - `trades` table with price/volume data
   - `order_book` table with bid/ask prices
   - `market_depth` and `recent_trades_24h` views
   - Mock market data endpoints (`/api/v1/market/summary`, `/api/v1/market/depth`)
   - Empty `/api/v1/market/mid-price` endpoint directory

3. **Current Pricing**: Uses hardcoded mock rates (EUR/AOA: 655.50, AOA/EUR: 0.00152)

### **Missing Functions**: The `get_market_summary` function references non-existent functions:
   - `suggest_optimal_price()` 
   - `get_market_spread()`
   - `calculate_price_trend()`

---

## **🎯 Detailed Implementation Plan: VWAP → Mid-Market Rate Migration**

### **Phase 1: Database Schema & Functions (Week 1)**

#### **1.1 Create Exchange Rates Storage Table**
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL CHECK (base_currency IN ('EUR', 'AOA')),
  quote_currency TEXT NOT NULL CHECK (quote_currency IN ('EUR', 'AOA')),
  mid_market_rate DECIMAL(12,8) NOT NULL CHECK (mid_market_rate > 0),
  bid_rate DECIMAL(12,8) NOT NULL CHECK (bid_rate > 0),
  ask_rate DECIMAL(12,8) NOT NULL CHECK (ask_rate > 0),
  spread_percentage DECIMAL(5,4) NOT NULL CHECK (spread_percentage >= 0),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_points INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'calculated' CHECK (source IN ('calculated', 'external', 'fallback')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT different_currencies CHECK (base_currency != quote_currency),
  CONSTRAINT valid_spread CHECK (ask_rate >= bid_rate),
  CONSTRAINT valid_mid_rate CHECK (mid_market_rate >= bid_rate AND mid_market_rate <= ask_rate)
);

-- Indexes for performance
CREATE INDEX idx_exchange_rates_pair_time ON exchange_rates(base_currency, quote_currency, created_at DESC);
CREATE INDEX idx_exchange_rates_recent ON exchange_rates(created_at DESC) WHERE created_at > NOW() - INTERVAL '1 hour';
```

#### **1.2 Create Mid-Market Rate Calculation Function**
```sql
CREATE OR REPLACE FUNCTION calculate_mid_market_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_lookback_hours INTEGER DEFAULT 1
) RETURNS TABLE (
  mid_market_rate DECIMAL(12,8),
  bid_rate DECIMAL(12,8),
  ask_rate DECIMAL(12,8),
  spread_percentage DECIMAL(5,4),
  confidence_score DECIMAL(3,2),
  data_points INTEGER
) AS $$
DECLARE
  v_best_bid DECIMAL(12,8);
  v_best_ask DECIMAL(12,8);
  v_mid_rate DECIMAL(12,8);
  v_spread DECIMAL(5,4);
  v_trade_count INTEGER;
  v_confidence DECIMAL(3,2);
BEGIN
  -- Get best bid (highest buy price)
  SELECT MAX(price) INTO v_best_bid
  FROM order_book
  WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND side = 'buy'
    AND status IN ('pending', 'partially_filled')
    AND created_at > NOW() - (p_lookback_hours || ' hours')::INTERVAL;

  -- Get best ask (lowest sell price)
  SELECT MIN(price) INTO v_best_ask
  FROM order_book
  WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND side = 'sell'
    AND status IN ('pending', 'partially_filled')
    AND created_at > NOW() - (p_lookback_hours || ' hours')::INTERVAL;

  -- Count recent trades for confidence scoring
  SELECT COUNT(*) INTO v_trade_count
  FROM trades
  WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND executed_at > NOW() - (p_lookback_hours || ' hours')::INTERVAL;

  -- Fallback to recent trade average if no order book data
  IF v_best_bid IS NULL OR v_best_ask IS NULL THEN
    SELECT AVG(price) INTO v_mid_rate
    FROM trades
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND executed_at > NOW() - (p_lookback_hours || ' hours')::INTERVAL;
    
    IF v_mid_rate IS NULL THEN
      -- Use hardcoded fallback rates
      v_mid_rate := CASE 
        WHEN p_base_currency = 'EUR' AND p_quote_currency = 'AOA' THEN 655.50
        WHEN p_base_currency = 'AOA' AND p_quote_currency = 'EUR' THEN 0.00152
        ELSE NULL
      END;
      
      v_best_bid := v_mid_rate * 0.999; -- 0.1% spread
      v_best_ask := v_mid_rate * 1.001;
      v_confidence := 0.1; -- Low confidence for fallback
    ELSE
      -- Use trade average with estimated spread
      v_best_bid := v_mid_rate * 0.995; -- 0.5% spread
      v_best_ask := v_mid_rate * 1.005;
      v_confidence := LEAST(0.7, v_trade_count * 0.1); -- Max 0.7 for trade-based
    END IF;
  ELSE
    -- Calculate mid-market rate from order book
    v_mid_rate := (v_best_bid + v_best_ask) / 2;
    
    -- Calculate confidence based on order book depth and recent trades
    v_confidence := LEAST(1.0, 
      0.5 + -- Base confidence for order book data
      (v_trade_count * 0.05) + -- Trade activity bonus
      CASE WHEN v_best_bid > 0 AND v_best_ask > 0 THEN 0.3 ELSE 0 END -- Order book bonus
    );
  END IF;

  -- Calculate spread percentage
  IF v_best_bid > 0 AND v_best_ask > 0 THEN
    v_spread := ((v_best_ask - v_best_bid) / v_mid_rate) * 100;
  ELSE
    v_spread := 1.0; -- Default 1% spread
  END IF;

  RETURN QUERY SELECT 
    v_mid_rate,
    v_best_bid,
    v_best_ask,
    v_spread,
    v_confidence,
    v_trade_count;
END;
$$ LANGUAGE plpgsql;
```

#### **1.3 Create Rate Update Trigger Function**
```sql
CREATE OR REPLACE FUNCTION update_exchange_rates_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update exchange rates when trades occur
  INSERT INTO exchange_rates (
    base_currency, quote_currency, mid_market_rate, bid_rate, ask_rate, 
    spread_percentage, confidence_score, data_points, source
  )
  SELECT * FROM calculate_mid_market_rate(NEW.base_currency, NEW.quote_currency, 1)
  ON CONFLICT DO NOTHING; -- Prevent duplicate rapid updates
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on trades table
CREATE TRIGGER update_rates_on_trade
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_exchange_rates_trigger();
```

### **Phase 2: API Implementation (Week 2)**

#### **2.1 Create Mid-Market Rate Endpoint**
```typescript
// src/app/api/v1/market/mid-price/route.ts
import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { z } from 'zod';

const midPriceSchema = z.object({
  baseCurrency: z.enum(['EUR', 'AOA']).default('EUR'),
  quoteCurrency: z.enum(['EUR', 'AOA']).default('AOA'),
  lookbackHours: z.coerce.number().min(1).max(24).default(1)
});

async function midPriceHandler(request: NextRequest) {
  const validation = validateSearchParams(request, midPriceSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { baseCurrency, quoteCurrency, lookbackHours } = validation.data!;

  if (baseCurrency === quoteCurrency) {
    return ErrorResponses.validationError('Base and quote currencies must be different');
  }

  try {
    // Get latest mid-market rate
    const result = await executeSQL(`
      SELECT 
        mid_market_rate,
        bid_rate,
        ask_rate,
        spread_percentage,
        confidence_score,
        created_at,
        source
      FROM exchange_rates
      WHERE base_currency = $1 AND quote_currency = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [baseCurrency, quoteCurrency]);

    if (result.length === 0) {
      // Calculate real-time rate if no stored data
      const liveRate = await executeSQL(`
        SELECT * FROM calculate_mid_market_rate($1, $2, $3)
      `, [baseCurrency, quoteCurrency, lookbackHours]);

      if (liveRate.length === 0) {
        return ErrorResponses.notFound('No market data available for this currency pair');
      }

      const rate = liveRate[0];
      return createSuccessResponse({
        pair: `${baseCurrency}/${quoteCurrency}`,
        midMarketRate: rate.mid_market_rate,
        bidRate: rate.bid_rate,
        askRate: rate.ask_rate,
        spreadPercentage: rate.spread_percentage,
        confidenceScore: rate.confidence_score,
        dataPoints: rate.data_points,
        timestamp: new Date().toISOString(),
        source: 'real-time',
        isLive: true
      });
    }

    const rate = result[0];
    return createSuccessResponse({
      pair: `${baseCurrency}/${quoteCurrency}`,
      midMarketRate: rate.mid_market_rate,
      bidRate: rate.bid_rate,
      askRate: rate.ask_rate,
      spreadPercentage: rate.spread_percentage,
      confidenceScore: rate.confidence_score,
      timestamp: rate.created_at,
      source: rate.source,
      isLive: false
    });

  } catch (error) {
    console.error('Mid-price calculation error:', error);
    return ErrorResponses.databaseError('Failed to calculate mid-market rate');
  }
}

export const GET = withCors(withErrorHandling(midPriceHandler));
```

#### **2.2 Update Market Summary to Use Mid-Market Rate**
```typescript
// Update src/app/api/v1/market/summary/route.ts
// Replace mock data with real mid-market rate calculations
```

### **Phase 3: Frontend Integration (Week 3)**

#### **3.1 Create Mid-Market Rate Hook**
```typescript
// src/hooks/use-mid-market-rate.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface MidMarketRate {
  pair: string;
  midMarketRate: number;
  bidRate: number;
  askRate: number;
  spreadPercentage: number;
  confidenceScore: number;
  timestamp: string;
  source: string;
  isLive: boolean;
}

export function useMidMarketRate(
  baseCurrency: 'EUR' | 'AOA',
  quoteCurrency: 'EUR' | 'AOA',
  options?: {
    lookbackHours?: number;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['midMarketRate', baseCurrency, quoteCurrency, options?.lookbackHours],
    queryFn: async () => {
      const params = new URLSearchParams({
        baseCurrency,
        quoteCurrency,
        ...(options?.lookbackHours && { lookbackHours: options.lookbackHours.toString() })
      });
      
      const response = await apiClient.get<MidMarketRate>(`/market/mid-price?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch mid-market rate');
      }
      return response.data!;
    },
    refetchInterval: options?.refetchInterval || 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
  });
}
```

#### **3.2 Update Trading Components**
```typescript
// Update src/components/features/trading/sell.tsx
// Replace hardcoded rates with useMidMarketRate hook

// Update src/components/features/convert/convert-page.tsx
// Replace mock exchange rates with real mid-market rates
```

### **Phase 4: Database Migration & Cleanup (Week 4)**

#### **4.1 Fix Missing Functions**
```sql
-- Create missing functions referenced by get_market_summary
CREATE OR REPLACE FUNCTION suggest_optimal_price(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_side TEXT,
  p_amount DECIMAL DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  suggested_price DECIMAL(12,8),
  vwap_price DECIMAL(12,8),
  confidence_level TEXT,
  confidence_score DECIMAL(3,2),
  warnings TEXT[]
) AS $$
BEGIN
  -- Implementation using mid-market rate instead of VWAP
  RETURN QUERY
  SELECT 
    cmr.mid_market_rate as suggested_price,
    cmr.mid_market_rate as vwap_price, -- Replace VWAP with mid-market
    CASE 
      WHEN cmr.confidence_score >= 0.8 THEN 'HIGH'
      WHEN cmr.confidence_score >= 0.5 THEN 'MEDIUM'
      ELSE 'LOW'
    END as confidence_level,
    cmr.confidence_score,
    ARRAY[]::TEXT[] as warnings
  FROM calculate_mid_market_rate(p_base_currency, p_quote_currency, p_hours) cmr;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_market_spread(
  p_base_currency TEXT,
  p_quote_currency TEXT
) RETURNS TABLE (
  best_bid DECIMAL(12,8),
  best_ask DECIMAL(12,8),
  spread DECIMAL(12,8),
  spread_percentage DECIMAL(5,4),
  bid_volume DECIMAL(15,2),
  ask_volume DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cmr.bid_rate as best_bid,
    cmr.ask_rate as best_ask,
    (cmr.ask_rate - cmr.bid_rate) as spread,
    cmr.spread_percentage,
    COALESCE(bid_vol.volume, 0) as bid_volume,
    COALESCE(ask_vol.volume, 0) as ask_volume
  FROM calculate_mid_market_rate(p_base_currency, p_quote_currency, 1) cmr
  LEFT JOIN (
    SELECT SUM(remaining_quantity) as volume
    FROM order_book 
    WHERE base_currency = p_base_currency 
      AND quote_currency = p_quote_currency 
      AND side = 'buy'
      AND status IN ('pending', 'partially_filled')
  ) bid_vol ON true
  LEFT JOIN (
    SELECT SUM(remaining_quantity) as volume
    FROM order_book 
    WHERE base_currency = p_base_currency 
      AND quote_currency = p_quote_currency 
      AND side = 'sell'
      AND status IN ('pending', 'partially_filled')
  ) ask_vol ON true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_price_trend(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_comparison_hours INTEGER DEFAULT 4,
  p_total_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  trend_direction TEXT,
  trend_percentage DECIMAL(5,2),
  recent_avg DECIMAL(12,8),
  comparison_avg DECIMAL(12,8)
) AS $$
DECLARE
  v_recent_avg DECIMAL(12,8);
  v_comparison_avg DECIMAL(12,8);
  v_trend_pct DECIMAL(5,2);
  v_direction TEXT;
BEGIN
  -- Get recent average (last p_comparison_hours)
  SELECT AVG(price) INTO v_recent_avg
  FROM trades
  WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND executed_at > NOW() - (p_comparison_hours || ' hours')::INTERVAL;

  -- Get comparison average (p_comparison_hours to p_total_hours ago)
  SELECT AVG(price) INTO v_comparison_avg
  FROM trades
  WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND executed_at BETWEEN 
      NOW() - (p_total_hours || ' hours')::INTERVAL AND 
      NOW() - (p_comparison_hours || ' hours')::INTERVAL;

  -- Calculate trend
  IF v_recent_avg IS NOT NULL AND v_comparison_avg IS NOT NULL AND v_comparison_avg > 0 THEN
    v_trend_pct := ((v_recent_avg - v_comparison_avg) / v_comparison_avg) * 100;
    v_direction := CASE 
      WHEN v_trend_pct > 1 THEN 'BULLISH'
      WHEN v_trend_pct < -1 THEN 'BEARISH'
      ELSE 'NEUTRAL'
    END;
  ELSE
    v_trend_pct := 0;
    v_direction := 'NEUTRAL';
  END IF;

  RETURN QUERY SELECT v_direction, v_trend_pct, v_recent_avg, v_comparison_avg;
END;
$$ LANGUAGE plpgsql;
```

#### **4.2 Update Market Summary Function**
```sql
-- The get_market_summary function will now work with mid-market rates
-- instead of VWAP since we replaced the vwap_price with mid_market_rate
```

### **Phase 5: Testing & Validation (Week 5)**

#### **5.1 Create Test Data**
```sql
-- Insert test orders and trades
INSERT INTO order_book (user_id, order_type, side, base_currency, quote_currency, quantity, remaining_quantity, price, status)
VALUES 
  (gen_random_uuid(), 'limit', 'buy', 'EUR', 'AOA', 100, 100, 650.00, 'pending'),
  (gen_random_uuid(), 'limit', 'sell', 'EUR', 'AOA', 100, 100, 660.00, 'pending'),
  (gen_random_uuid(), 'limit', 'buy', 'AOA', 'EUR', 650000, 650000, 0.00151, 'pending'),
  (gen_random_uuid(), 'limit', 'sell', 'AOA', 'EUR', 660000, 660000, 0.00153, 'pending');

-- Insert test trades
INSERT INTO trades (buy_order_id, sell_order_id, buyer_id, seller_id, base_currency, quote_currency, quantity, price, quote_amount)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'EUR', 'AOA', 50, 655.25, 32762.50),
  (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'AOA', 'EUR', 327625, 0.001525, 499.63);
```

#### **5.2 API Testing**
```bash
# Test mid-market rate endpoint
curl "http://localhost:3000/api/v1/market/mid-price?baseCurrency=EUR&quoteCurrency=AOA"

# Test market summary with new mid-market rates
curl "http://localhost:3000/api/v1/market/summary?baseCurrency=EUR&quoteCurrency=AOA"
```

### **Phase 6: Deployment & Monitoring (Week 6)**

#### **6.1 Database Migration Script**
```sql
-- Apply all database changes in transaction
BEGIN;

-- Create tables and functions
-- (All the SQL from phases above)

-- Update existing data
UPDATE exchange_rates SET source = 'migrated' WHERE source = 'calculated';

COMMIT;
```

#### **6.2 Monitoring & Alerts**
```typescript
// Add monitoring for mid-market rate accuracy
// Set up alerts for confidence score drops
// Monitor API response times
```

---

## **🚨 Migration Risks & Mitigation**

### **Risks:**
1. **Rate Volatility**: Mid-market rates may be more volatile than VWAP
2. **Data Availability**: Insufficient order book data for accurate rates
3. **Performance**: Real-time calculations may be slower

### **Mitigation:**
1. **Confidence Scoring**: Implement confidence levels based on data quality
2. **Fallback Mechanisms**: Use recent trade averages when order book is thin
3. **Caching Strategy**: Cache rates for 15-30 seconds to balance accuracy and performance
4. **Gradual Rollout**: A/B test with percentage of users first

This plan provides a comprehensive migration from VWAP to mid-market rate with proper database design, API implementation, and frontend integration while maintaining system reliability and performance.
