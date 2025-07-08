// DEPRECATED: Legacy marketplace-based buy component
// This component has been replaced by the new order book system
// Use BuyOrderBook component instead

"use client"

import { BuyOrderBook } from "./buy-order-book"

// Legacy Buy Component - Redirects to Order Book System
export function BuyFlow() {
  return <BuyOrderBook />
}

// Export for backward compatibility
export default BuyFlow
