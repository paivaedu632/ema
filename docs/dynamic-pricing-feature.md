# 🔄 **EmaPay Dynamic Pricing Feature - Complete Implementation Guide**

## **📋 Overview**

The Dynamic Pricing feature allows sellers to enable automatic price updates for their limit orders based on real-time market conditions. This sophisticated system uses Volume Weighted Average Price (VWAP) calculations and competitive margins to optimize order positioning in the order book.

## **🎯 Key Features**

### **1. Automatic Price Updates**
- **VWAP-Based Pricing**: Uses 12-hour rolling VWAP calculations
- **Competitive Margins**: 2-5% below VWAP for market competitiveness
- **5-Minute Intervals**: Regular price recalculation and updates
- **1% Change Threshold**: Only updates when price differs by more than 1%

### **2. Price Bounds Protection**
- **±20% Bounds**: Prevents extreme price fluctuations from original price
- **Maximum 10% Change**: Limits single update to 10% price change
- **Original Price Preservation**: Always maintains reference to user's initial price

### **3. Market Data Integration**
- **Real-Time VWAP**: Calculated from actual trade history
- **Volume Requirements**: Minimum trade volume thresholds for reliability
- **Fallback Mechanisms**: Uses best ask pricing when insufficient data

## **🏗️ Technical Architecture**

### **Database Schema Changes**

#### **Enhanced `order_book` Table**
```sql
ALTER TABLE order_book 
ADD COLUMN dynamic_pricing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN original_price DECIMAL(10,6),
ADD COLUMN last_price_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN price_update_count INTEGER DEFAULT 0,
ADD COLUMN min_price_bound DECIMAL(10,6),
ADD COLUMN max_price_bound DECIMAL(10,6);
```

#### **New `price_updates` Audit Table**
```sql
CREATE TABLE price_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES order_book(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    old_price DECIMAL(10,6) NOT NULL,
    new_price DECIMAL(10,6) NOT NULL,
    price_change_percentage DECIMAL(5,2) NOT NULL,
    update_reason TEXT NOT NULL,
    vwap_reference DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Configuration Table**
```sql
CREATE TABLE dynamic_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

### **Core Database Functions**

#### **1. VWAP Calculation**
```sql
CREATE OR REPLACE FUNCTION calculate_vwap(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_hours INTEGER DEFAULT 12
)
RETURNS TABLE(
    vwap DECIMAL(10,6),
    total_volume DECIMAL(15,2),
    trade_count INTEGER,
    calculation_period INTERVAL
)
```

#### **2. Dynamic Price Calculation**
```sql
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
    p_order_id UUID,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_original_price DECIMAL(10,6),
    p_current_price DECIMAL(10,6)
)
RETURNS TABLE(
    suggested_price DECIMAL(10,6),
    price_source TEXT,
    vwap_reference DECIMAL(10,6),
    competitive_margin DECIMAL(5,2),
    price_change_percentage DECIMAL(5,2),
    update_recommended BOOLEAN
)
```

#### **3. Batch Processing**
```sql
CREATE OR REPLACE FUNCTION process_all_dynamic_pricing_updates()
RETURNS TABLE(
    total_orders_processed INTEGER,
    orders_updated INTEGER,
    orders_unchanged INTEGER,
    processing_duration INTERVAL,
    update_summary JSONB
)
```

## **🔌 API Endpoints**

### **1. Order Placement with Dynamic Pricing**
```http
POST /api/orders/place
Content-Type: application/json

{
  "side": "sell",
  "type": "limit",
  "base_currency": "EUR",
  "quote_currency": "AOA",
  "quantity": 10,
  "price": 1250,
  "dynamic_pricing_enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "status": "pending",
    "reserved_amount": 10,
    "created_at": "2025-01-24T10:00:00Z",
    "message": "Ordem criada com sucesso",
    "dynamic_pricing_info": {
      "enabled": true,
      "original_price": 1250,
      "min_bound": 1000,
      "max_bound": 1500,
      "bounds_percentage": 20
    }
  }
}
```

### **2. Toggle Dynamic Pricing**
```http
PUT /api/orders/{orderId}/dynamic-pricing
Content-Type: application/json

{
  "enabled": true
}
```

### **3. Price History**
```http
GET /api/orders/{orderId}/price-history?limit=20&from_date=2025-01-20T00:00:00Z
```

### **4. VWAP Calculation**
```http
GET /api/market/vwap/EUR-AOA?hours=12
```

### **5. Background Processing**
```http
POST /api/admin/process-dynamic-pricing
X-Cron-Secret: your-secret-key
```

## **⚙️ Configuration Parameters**

### **System Configuration**
```json
{
  "vwap_calculation_hours": 12,
  "competitive_margin_percentage": 3.0,
  "price_update_interval_minutes": 5,
  "minimum_price_change_threshold": 1.0,
  "maximum_price_change_per_update": 10.0,
  "minimum_trade_volume_for_vwap": 100,
  "price_bounds_percentage": 20.0
}
```

### **Customizable Settings**
- **VWAP Period**: 1-168 hours (default: 12 hours)
- **Competitive Margin**: 0-50% (default: 3%)
- **Update Interval**: 1-60 minutes (default: 5 minutes)
- **Change Threshold**: 0.1-10% (default: 1%)
- **Price Bounds**: 5-100% (default: 20%)

## **🔄 Processing Flow**

### **1. Order Placement Flow**
```
User Places Order → Validate Dynamic Pricing Rules → Set Price Bounds → 
Create Order → Schedule First Update → Return Success
```

### **2. Price Update Flow**
```
Cron Job Triggers → Get Eligible Orders → Calculate VWAP → 
Determine New Price → Validate Bounds → Update Order → 
Record Audit Trail → Notify User (if significant change)
```

### **3. VWAP Calculation Flow**
```
Get Trade History → Filter by Time Period → Calculate Weighted Average → 
Validate Volume Threshold → Apply Competitive Margin → 
Return Suggested Price
```

## **📊 Business Rules**

### **Eligibility Criteria**
- ✅ **Limit sell orders only** (not market orders or buy orders)
- ✅ **Active orders** (pending or partially filled status)
- ✅ **User ownership** (only order owner can toggle)
- ✅ **Sufficient market data** (minimum trade volume requirements)

### **Price Update Rules**
- **Frequency**: Maximum once every 5 minutes per order
- **Change Limit**: Maximum 10% price change per update
- **Bounds Enforcement**: Cannot exceed ±20% of original price
- **Volume Requirement**: Minimum 100 units traded for VWAP calculation

### **Fallback Mechanisms**
1. **Insufficient VWAP Data**: Use best ask price with 1% discount
2. **No Market Data**: Keep current price unchanged
3. **Extreme Price Changes**: Apply maximum change limits
4. **System Errors**: Maintain current price and log error

## **🎛️ Frontend Integration**

### **Dynamic Pricing Toggle Component**
```tsx
<DynamicPricingToggle
  orderId="uuid"
  currentPrice={1250}
  originalPrice={1200}
  dynamicPricingEnabled={true}
  currency="AOA"
  onToggle={(enabled) => console.log('Toggled:', enabled)}
/>
```

### **Price History Display**
- Real-time price updates via WebSocket
- Historical price chart with change indicators
- VWAP reference line overlay
- Update reason annotations

## **🔐 Security & Validation**

### **Input Validation**
- **Order Ownership**: Verify user owns the order
- **Order Eligibility**: Validate order type and status
- **Price Bounds**: Enforce minimum/maximum price limits
- **Rate Limiting**: Prevent excessive API calls

### **Data Integrity**
- **Audit Trail**: Complete price update history
- **Atomic Updates**: Ensure consistent order book state
- **Error Handling**: Graceful degradation on failures
- **Rollback Capability**: Ability to disable dynamic pricing

## **📈 Performance Considerations**

### **Optimization Strategies**
- **Batch Processing**: Update multiple orders in single transaction
- **Caching**: Cache VWAP calculations for short periods
- **Indexing**: Optimized database indexes for price queries
- **Concurrent Processing**: Prevent overlapping update cycles

### **Monitoring Metrics**
- **Processing Time**: Average time per order update
- **Success Rate**: Percentage of successful updates
- **Price Accuracy**: Deviation from expected VWAP
- **System Load**: Database and API performance impact

## **🚀 Deployment & Maintenance**

### **Database Migration**
```bash
# Apply schema changes
npx supabase db push

# Verify functions
npx supabase db functions list

# Test configuration
node scripts/test-dynamic-pricing.js
```

### **Cron Job Setup**
```bash
# Every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/admin/process-dynamic-pricing \
  -H "X-Cron-Secret: your-secret" \
  -H "Content-Type: application/json"
```

### **Monitoring & Alerts**
- **Failed Updates**: Alert when update success rate drops below 95%
- **Price Anomalies**: Alert on extreme price changes
- **System Health**: Monitor processing duration and database performance
- **User Notifications**: Inform users of significant price changes (>10%)

The Dynamic Pricing feature represents a sophisticated trading enhancement that provides automated market-responsive pricing while maintaining user control and system stability.
