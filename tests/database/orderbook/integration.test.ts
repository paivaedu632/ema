import { 
  createTestUser, 
  createTestWallet, 
  placeTestOrder, 
  getOrderDetails, 
  getWalletBalance,
  executeQuery,
  functionExists 
} from '../setup';

describe('Order Book Integration Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeEach(async () => {
    user1Id = await createTestUser();
    user2Id = await createTestUser();
    user3Id = await createTestUser();
    
    // Setup wallets for all users
    for (const userId of [user1Id, user2Id, user3Id]) {
      await createTestWallet(userId, 'EUR', 10000);
      await createTestWallet(userId, 'AOA', 10000000);
    }
  });

  describe('Complex Order Matching Scenarios', () => {
    test('should handle multiple partial fills correctly', async () => {
      // Place large sell order
      const sellOrderId = await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 1000,
        price: 900
      });

      // Place multiple smaller buy orders
      const buyOrder1Id = await placeTestOrder({
        userId: user2Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 300,
        price: 900
      });

      const buyOrder2Id = await placeTestOrder({
        userId: user3Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 250,
        price: 900
      });

      // Check order statuses
      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder1 = await getOrderDetails(buyOrder1Id);
      const buyOrder2 = await getOrderDetails(buyOrder2Id);

      // Buy orders should be fully filled
      expect(buyOrder1.status).toBe('filled');
      expect(buyOrder2.status).toBe('filled');
      expect(parseFloat(buyOrder1.filled_quantity)).toBe(300);
      expect(parseFloat(buyOrder2.filled_quantity)).toBe(250);

      // Sell order should be partially filled
      expect(sellOrder.status).toBe('pending');
      expect(parseFloat(sellOrder.filled_quantity)).toBe(550);

      // Check balance updates
      const user2EurBalance = await getWalletBalance(user2Id, 'EUR');
      const user3EurBalance = await getWalletBalance(user3Id, 'EUR');
      const user1AoaBalance = await getWalletBalance(user1Id, 'AOA');

      expect(user2EurBalance.available).toBe(10300); // 10000 + 300
      expect(user3EurBalance.available).toBe(10250); // 10000 + 250
      expect(user1AoaBalance.available).toBe(10495000); // 10000000 + (550 * 900)
    });

    test('should handle price improvement correctly', async () => {
      // Place sell order at high price
      await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 1000
      });

      // Place sell order at better price
      await placeTestOrder({
        userId: user2Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Place buy order that should get price improvement
      const buyOrderId = await placeTestOrder({
        userId: user3Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50,
        price: 1000
      });

      // Should match at 900 (better price), not 1000
      const trades = await executeQuery(`
        SELECT * FROM trades WHERE buy_order_id = $1
      `, [buyOrderId]);

      expect(trades.length).toBe(1);
      expect(parseFloat(trades[0].price)).toBe(900);
      expect(parseFloat(trades[0].total_amount)).toBe(45000); // 50 * 900
    });

    test('should handle order book depth correctly', async () => {
      // Create order book with multiple price levels
      const sellOrders = [];
      const buyOrders = [];

      // Sell side (asks)
      for (let i = 0; i < 5; i++) {
        const price = 900 + (i * 10); // 900, 910, 920, 930, 940
        sellOrders.push(await placeTestOrder({
          userId: user1Id,
          orderType: 'limit',
          side: 'sell',
          baseCurrency: 'EUR',
          quoteCurrency: 'AOA',
          quantity: 100,
          price: price
        }));
      }

      // Buy side (bids)
      for (let i = 0; i < 5; i++) {
        const price = 890 - (i * 10); // 890, 880, 870, 860, 850
        buyOrders.push(await placeTestOrder({
          userId: user2Id,
          orderType: 'limit',
          side: 'buy',
          baseCurrency: 'EUR',
          quoteCurrency: 'AOA',
          quantity: 100,
          price: price
        }));
      }

      // Check best prices
      const bestPrices = await executeQuery(`
        SELECT get_best_prices('EUR', 'AOA') as prices
      `);

      if (bestPrices.length > 0 && bestPrices[0].prices) {
        const prices = bestPrices[0].prices;
        expect(prices.best_bid).toBe(890);
        expect(prices.best_ask).toBe(900);
        expect(prices.spread).toBe(10);
      }

      // Place market order that should walk the book
      const marketOrderId = await placeTestOrder({
        userId: user3Id,
        orderType: 'market',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 250 // Should fill 2.5 levels
      });

      const marketOrder = await getOrderDetails(marketOrderId);
      expect(marketOrder.status).toBe('filled');
      expect(parseFloat(marketOrder.filled_quantity)).toBe(250);

      // Check that multiple sell orders were affected
      const sellOrder1 = await getOrderDetails(sellOrders[0]);
      const sellOrder2 = await getOrderDetails(sellOrders[1]);
      const sellOrder3 = await getOrderDetails(sellOrders[2]);

      expect(sellOrder1.status).toBe('filled'); // 100 @ 900
      expect(sellOrder2.status).toBe('filled'); // 100 @ 910
      expect(sellOrder3.status).toBe('pending'); // 50 @ 920
      expect(parseFloat(sellOrder3.filled_quantity)).toBe(50);
    });

    test('should handle same-user order prevention', async () => {
      // Place sell order
      await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Try to place matching buy order from same user
      const buyOrderId = await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Orders should not match (same user)
      const buyOrder = await getOrderDetails(buyOrderId);
      expect(buyOrder.status).toBe('pending');
      expect(parseFloat(buyOrder.filled_quantity)).toBe(0);
    });
  });

  describe('Order Book Analytics', () => {
    test('should calculate market statistics correctly', async () => {
      // Create some trading activity
      await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      await placeTestOrder({
        userId: user2Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Check if analytics functions exist and work
      const analyticsExists = await functionExists('get_trade_execution_analytics');
      if (analyticsExists) {
        const analytics = await executeQuery(`
          SELECT get_trade_execution_analytics('EUR', 'AOA', INTERVAL '1 hour') as stats
        `);

        expect(analytics.length).toBeGreaterThan(0);
        
        if (analytics[0].stats) {
          const stats = analytics[0].stats;
          expect(stats.total_volume).toBeGreaterThan(0);
          expect(stats.trade_count).toBeGreaterThan(0);
        }
      }
    });

    test('should track order execution performance', async () => {
      const startTime = Date.now();

      // Place and execute orders
      const sellOrderId = await placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const buyOrderId = await placeTestOrder({
        userId: user2Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Execution should be reasonably fast (less than 1 second)
      expect(executionTime).toBeLessThan(1000);

      // Check that orders were executed
      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder = await getOrderDetails(buyOrderId);

      expect(sellOrder.status).toBe('filled');
      expect(buyOrder.status).toBe('filled');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle zero quantity orders', async () => {
      await expect(placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 0,
        price: 900
      })).rejects.toThrow();
    });

    test('should handle extremely large orders', async () => {
      // Try to place order larger than total wallet balance
      await expect(placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50000, // Much larger than 10000 EUR balance
        price: 900
      })).rejects.toThrow();
    });

    test('should handle invalid currency pairs', async () => {
      await expect(placeTestOrder({
        userId: user1Id,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'EUR', // Same currency
        quantity: 100,
        price: 900
      })).rejects.toThrow();
    });
  });
});
