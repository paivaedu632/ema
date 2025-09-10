/**
 * Test Helper Utilities
 * Common utilities and assertions for EmaPay API tests
 */

import { TestUser } from './user-factory';
import { ApiResponse } from './api-client';

/**
 * Standard API response structure
 */
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Wallet balance structure
 */
export interface WalletBalance {
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
}

/**
 * Transfer structure
 */
export interface Transfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  currency: string;
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
}

/**
 * Order structure
 */
export interface Order {
  id: string;
  userId: string;
  side: 'buy' | 'sell';
  currency: string;
  amount: number;
  price?: number;
  status: string;
  createdAt: string;
}

/**
 * Test assertion helpers
 */
export class TestHelpers {
  /**
   * Assert that response is a successful API response
   */
  static assertSuccessResponse<T>(
    response: ApiResponse<StandardApiResponse<T>>,
    expectedStatus: number = 200
  ): T {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.error).toBeUndefined();
    
    return response.body.data!;
  }

  /**
   * Assert that response is an error API response
   */
  static assertErrorResponse(
    response: ApiResponse<StandardApiResponse>,
    expectedStatus: number,
    expectedErrorCode?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.data).toBeUndefined();
    
    if (expectedErrorCode) {
      expect(response.body.code).toBe(expectedErrorCode);
    }
  }

  /**
   * Assert that response time is within acceptable limits
   */
  static assertResponseTime(
    response: ApiResponse,
    maxTimeMs: number
  ): void {
    expect(response.responseTime).toHaveResponseTime(maxTimeMs);
  }

  /**
   * Assert that user data is valid
   */
  static assertValidUserData(userData: any): void {
    expect(userData).toHaveProperty('userId');
    expect(userData.userId).toBeValidUUID();
    
    if (userData.email) {
      expect(userData.email).toBeValidEmail();
    }
    
    expect(userData).toHaveProperty('authenticated', true);
  }

  /**
   * Assert that wallet balance is valid
   */
  static assertValidWalletBalance(balance: WalletBalance): void {
    expect(balance).toHaveProperty('currency');
    expect(balance.currency).toBeValidCurrency();
    
    expect(balance).toHaveProperty('availableBalance');
    expect(balance.availableBalance).toBeValidAmount();
    
    expect(balance).toHaveProperty('reservedBalance');
    expect(balance.reservedBalance).toBeValidAmount();
    
    expect(balance).toHaveProperty('totalBalance');
    expect(balance.totalBalance).toBeValidAmount();
    
    // Total balance should equal available + reserved
    expect(balance.totalBalance).toBe(balance.availableBalance + balance.reservedBalance);
  }

  /**
   * Assert that transfer data is valid
   */
  static assertValidTransfer(transfer: Transfer): void {
    // API uses senderId/recipientId instead of id/fromUserId/toUserId
    expect(transfer).toHaveProperty('senderId');
    expect(transfer.senderId).toBeValidUUID();

    expect(transfer).toHaveProperty('recipientId');
    expect(transfer.recipientId).toBeValidUUID();
    
    expect(transfer).toHaveProperty('currency');
    expect(transfer.currency).toBeValidCurrency();
    
    expect(transfer).toHaveProperty('amount');
    expect(transfer.amount).toBeValidAmount();
    
    expect(transfer).toHaveProperty('status');
    expect(['pending', 'completed', 'failed', 'cancelled']).toContain(transfer.status);
    
    // Check for either createdAt or timestamp field
    if (transfer.createdAt) {
      expect(new Date(transfer.createdAt)).toBeInstanceOf(Date);
    } else if (transfer.timestamp) {
      expect(new Date(transfer.timestamp)).toBeInstanceOf(Date);
    } else {
      expect(transfer).toHaveProperty('createdAt');
    }
  }

  /**
   * Assert that order data is valid
   */
  static assertValidOrder(order: Order): void {
    expect(order).toHaveProperty('id');
    expect(order.id).toBeValidUUID();
    
    expect(order).toHaveProperty('userId');
    expect(order.userId).toBeValidUUID();
    
    expect(order).toHaveProperty('side');
    expect(['buy', 'sell']).toContain(order.side);
    
    expect(order).toHaveProperty('currency');
    expect(order.currency).toBeValidCurrency();
    
    expect(order).toHaveProperty('amount');
    expect(order.amount).toBeValidAmount();
    
    if (order.price) {
      expect(order.price).toBeValidAmount();
    }
    
    expect(order).toHaveProperty('status');
    expect(['pending', 'filled', 'cancelled', 'partial']).toContain(order.status);
    
    expect(order).toHaveProperty('createdAt');
    expect(new Date(order.createdAt)).toBeInstanceOf(Date);
  }

  /**
   * Assert that market data is valid
   */
  static assertValidMarketData(marketData: any): void {
    expect(marketData).toHaveProperty('pair');
    expect(marketData.pair).toBe('EUR/AOA');
    
    if (marketData.lastPrice) {
      expect(marketData.lastPrice).toBeValidAmount();
    }
    
    if (marketData.volume24h) {
      expect(marketData.volume24h).toBeValidAmount();
    }
    
    if (marketData.change24h) {
      expect(typeof marketData.change24h).toBe('number');
    }
  }

  /**
   * Assert that order book data is valid
   */
  static assertValidOrderBook(orderBook: any): void {
    expect(orderBook).toHaveProperty('bids');
    expect(orderBook).toHaveProperty('asks');
    expect(orderBook).toHaveProperty('timestamp');
    
    expect(Array.isArray(orderBook.bids)).toBe(true);
    expect(Array.isArray(orderBook.asks)).toBe(true);
    
    // Check bid/ask structure
    orderBook.bids.forEach((bid: any) => {
      expect(bid).toHaveProperty('price');
      expect(bid).toHaveProperty('amount');
      expect(bid.price).toBeValidAmount();
      expect(bid.amount).toBeValidAmount();
    });
    
    orderBook.asks.forEach((ask: any) => {
      expect(ask).toHaveProperty('price');
      expect(ask).toHaveProperty('amount');
      expect(ask.price).toBeValidAmount();
      expect(ask.amount).toBeValidAmount();
    });
  }

  /**
   * Generate test data for transfers
   */
  static generateTransferData(
    recipientId: string,
    currency: 'EUR' | 'AOA' = 'EUR',
    amount: number = 10.50
  ) {
    return {
      recipientId,
      currency,
      amount,
      pin: '123456',
      description: `Test transfer ${Date.now()}`
    };
  }

  /**
   * Generate test data for limit orders
   */
  static generateLimitOrderData(
    side: 'buy' | 'sell' = 'buy',
    currency: 'EUR' | 'AOA' = 'EUR',
    amount: number = 100,
    price: number = 650
  ) {
    return {
      side,
      currency,
      amount,
      price,
      pin: '123456'
    };
  }

  /**
   * Generate test data for market orders
   */
  static generateMarketOrderData(
    side: 'buy' | 'sell' = 'buy',
    currency: 'EUR' | 'AOA' = 'EUR',
    amount: number = 100
  ) {
    return {
      side,
      currency,
      amount,
      pin: '123456'
    };
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Create a test PIN for users
   */
  static generateTestPin(): string {
    return '123456'; // Standard test PIN
  }

  /**
   * Validate decimal precision
   */
  static assertDecimalPrecision(value: number, maxDecimals: number = 2): void {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(maxDecimals);
  }

  /**
   * Assert that arrays are sorted correctly
   */
  static assertSortedByDate(items: any[], dateField: string = 'createdAt', descending: boolean = true): void {
    for (let i = 1; i < items.length; i++) {
      const current = new Date(items[i][dateField]).getTime();
      const previous = new Date(items[i - 1][dateField]).getTime();
      
      if (descending) {
        expect(current).toBeLessThanOrEqual(previous);
      } else {
        expect(current).toBeGreaterThanOrEqual(previous);
      }
    }
  }
}

export { TestHelpers as helpers };
