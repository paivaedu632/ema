# EmaPay Dynamic Exchange Rate System (VWAP)

## Overview

The Dynamic Exchange Rate System implements Volume Weighted Average Price (VWAP) calculation for EmaPay's peer-to-peer currency exchange. This system provides automatic, market-driven exchange rates with fallback mechanisms to ensure reliability.

## Architecture

### Database Schema

#### 1. Updated `offers` Table
- **New Column**: `dynamic_rate` (boolean, default: false)
  - `true`: Uses VWAP-calculated rates
  - `false`: Uses user-specified manual rates

#### 2. New `dynamic_rates` Table
```sql
CREATE TABLE dynamic_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair TEXT NOT NULL CHECK (currency_pair IN ('EUR_AOA', 'AOA_EUR')),
  vwap_rate DECIMAL(10,6) NOT NULL CHECK (vwap_rate > 0),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  transaction_count INTEGER NOT NULL CHECK (transaction_count >= 0),
  total_volume DECIMAL(15,2) NOT NULL CHECK (total_volume >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Core Functions

#### 1. VWAP Calculation
- **Function**: `calculate_vwap_rate(currency_pair, time_window_minutes, minimum_transactions)`
- **Time Window**: 60-minute rolling window (configurable)
- **Minimum Data**: Requires at least 3 transactions for reliable calculation
- **Formula**: VWAP = Σ(Price × Volume) / Σ(Volume)

#### 2. Dynamic Rate Retrieval
- **Function**: `get_dynamic_exchange_rate(currency_type, fallback_options)`
- **Fallback Hierarchy**:
  1. VWAP from last 60 minutes (if sufficient data)
  2. User-set rates from active offers
  3. Banco BAI API rates (final fallback)

#### 3. Rate Refresh
- **Function**: `refresh_all_vwap_rates()`
- **Frequency**: Every 5 minutes (recommended)
- **Caching**: Results cached for performance

## API Endpoints

### 1. Get Dynamic Rates
```
GET /api/exchange/dynamic-rates?currency=EUR&includeDetails=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "currency": "EUR",
    "rate": 924.5678,
    "source": "vwap",
    "last_updated": "2025-06-21T14:30:00Z",
    "formatted_rate": "1 EUR = 924.57 AOA",
    "is_stale": false,
    "details": {
      "currency_pair": "EUR_AOA",
      "transaction_count": 15,
      "total_volume": 2500.00
    }
  }
}
```

### 2. Refresh VWAP Rates
```
POST /api/exchange/dynamic-rates/refresh
```

### 3. Test Endpoint (Development)
```
GET /api/test/vwap?action=rates
```

## Frontend Integration

### Sell Component Updates

#### Rate Selection UI
- **Automatic Rates** (default): Uses VWAP-based dynamic rates
- **Manual Rates**: Uses user-specified rates based on desired receive amount

#### User Flow
1. **Amount Selection**: User specifies amount to sell
2. **Desired Amount**: User specifies amount to receive
3. **Rate Selection**: Choose between automatic (VWAP) or manual rates
4. **Confirmation**: Review and confirm offer

#### Rate Display
- Shows current VWAP rate when automatic option is selected
- Displays rate comparison between automatic and manual options
- Real-time rate updates with staleness indicators

## Rate Sources and Validation

### Source Priority
1. **VWAP** (highest priority): Market-driven, volume-weighted rates
2. **User Offers**: Average of active manual offers
3. **Banco BAI API** (fallback): External reference rates

### Validation Rules
- **Market Offers**: ±20% margin from VWAP baseline
- **API Baseline**: ±50% margin from Banco BAI rates
- **Range Limits**: 500-2000 AOA per EUR (safety bounds)

## Performance Considerations

### Caching Strategy
- **VWAP Calculations**: Cached for 5 minutes
- **Rate Retrieval**: Immediate response from cache when available
- **Background Refresh**: Scheduled updates every 5 minutes

### Database Optimization
- Indexed queries on `currency_pair` and `calculated_at`
- Efficient transaction filtering for VWAP calculations
- Minimal data retention (keep last 24 hours of calculations)

## Error Handling

### Graceful Degradation
1. **VWAP Unavailable**: Falls back to user rates
2. **No User Rates**: Falls back to API rates
3. **All Sources Fail**: Uses last known good rate with warning

### Monitoring
- Track VWAP calculation success rates
- Monitor rate source distribution
- Alert on extended fallback periods

## Configuration

### Environment Variables
```env
VWAP_TIME_WINDOW_MINUTES=60
VWAP_MINIMUM_TRANSACTIONS=3
VWAP_CACHE_DURATION_MINUTES=5
VWAP_REFRESH_INTERVAL_MINUTES=5
```

### Rate Limits
```typescript
const RATE_LIMITS = {
  MIN_RATE: 500,    // AOA per EUR
  MAX_RATE: 2000,   // AOA per EUR
  MARKET_MARGIN: 0.20,  // ±20%
  API_MARGIN: 0.50      // ±50%
}
```

## Testing

### Manual Testing
1. **Rate Calculation**: Use `/api/test/vwap?action=vwap`
2. **Rate Retrieval**: Use `/api/test/vwap?action=rates`
3. **Validation**: Use `/api/test/vwap?action=validate&rate=900&currency=EUR`

### Integration Testing
1. Create test transactions with known rates
2. Verify VWAP calculations match expected values
3. Test fallback mechanisms by disabling rate sources
4. Validate UI rate selection and display

## Deployment Notes

### Database Migration
1. Apply migration: `20250621140000_add_dynamic_rate_system.sql`
2. Apply function updates: `20250621141000_update_create_offer_dynamic_rate.sql`
3. Verify new tables and functions are created

### Monitoring Setup
- Set up alerts for VWAP calculation failures
- Monitor rate source distribution metrics
- Track user adoption of automatic vs manual rates

### Rollback Plan
- Dynamic rate system is backward compatible
- Existing offers continue working with `dynamic_rate = false`
- Can disable automatic rates in UI without data loss

## Future Enhancements

### Planned Features
1. **Multi-timeframe VWAP**: Support for different time windows
2. **Rate Prediction**: ML-based rate forecasting
3. **Market Depth**: Display available liquidity at different rates
4. **Rate Alerts**: Notify users of favorable rate conditions

### Scalability
- Consider moving VWAP calculations to background jobs
- Implement rate streaming for real-time updates
- Add support for additional currency pairs
