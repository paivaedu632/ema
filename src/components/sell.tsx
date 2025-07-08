// DEPRECATED: Legacy marketplace-based sell component
// This component has been replaced by the new order book system
// Use SellOrderBook component instead

"use client"

import { SellOrderBook } from "./sell-order-book"

// Legacy Sell Component - Redirects to Order Book System
export function SellFlow() {
  return <SellOrderBook />
}

// Export for backward compatibility
export default SellFlow
