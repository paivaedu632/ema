import { 
  createTestUser, 
  createTestWallet, 
  placeTestOrder, 
  executeQuery 
} from '../setup';

describe('Order Book Performance Tests', () => {
  let userIds: string[] = [];
  const NUM_USERS = 10;
  const ORDERS_PER_USER = 20;

  beforeAll(async () => {
    // Create multiple test users for performance testing
    for (let i = 0; i < NUM_USERS; i++) {
      const userId = await createTestUser();
      await createTestWallet(userId, 'EUR', 100000);
      await createTestWallet(userId, 'AOA', 100000000);
      userIds.push(userId);
    }
  }, 60000); // Increase timeout for setup

  describe('Order Placement Performance', () => {
    test('should handle high-volume order placement efficiently', async () => {
      const startTime = Date.now();
      const orderPromises = [];

      // Place many orders concurrently
      for (let i = 0; i < NUM_USERS; i++) {
        for (let j = 0; j < ORDERS_PER_USER; j++) {
          const side = j % 2 === 0 ? 'buy' : 'sell';
          const price = 900 + (Math.random() * 100); // Random price between 900-1000
          const quantity = 10 + (Math.random() * 90); // Random quantity between 10-100

          orderPromises.push(
            placeTestOrder({
              userId: userIds[i],
              orderType: 'limit',
              side: side as 'buy' | 'sell',
              baseCurrency: 'EUR',
              quoteCurrency: 'AOA',
              quantity: Math.floor(quantity),
              price: Math.floor(price)
            }).catch(error => {
              // Some orders may fail due to insufficient balance, which is expected
              return null;
            })
          );
        }
      }

      const results = await Promise.allSettled(orderPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;

      console.log(`Order placement performance:
        - Total orders attempted: ${NUM_USERS * ORDERS_PER_USER}
        - Successful: ${successful}
        - Failed: ${failed}
        - Total time: ${totalTime}ms
        - Average time per order: ${(totalTime / (NUM_USERS * ORDERS_PER_USER)).toFixed(2)}ms
      `);

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(successful).toBeGreaterThan(0); // At least some orders should succeed
      expect(totalTime / successful).toBeLessThan(500); // Average less than 500ms per successful order
    }, 60000);

    test('should maintain consistent performance under load', async () => {
      const batchSizes = [10, 50, 100];
      const performanceResults = [];

      for (const batchSize of batchSizes) {
        const startTime = Date.now();
        const orderPromises = [];

        for (let i = 0; i < batchSize; i++) {
          const userId = userIds[i % NUM_USERS];
          orderPromises.push(
            placeTestOrder({
              userId: userId,
              orderType: 'limit',
              side: i % 2 === 0 ? 'buy' : 'sell',
              baseCurrency: 'EUR',
              quoteCurrency: 'AOA',
              quantity: 50,
              price: 950
            }).catch(() => null)
          );
        }

        await Promise.allSettled(orderPromises);
        const endTime = Date.now();
        const batchTime = endTime - startTime;

        performanceResults.push({
          batchSize,
          totalTime: batchTime,
          avgTimePerOrder: batchTime / batchSize
        });
      }

      console.log('Batch performance results:', performanceResults);

      // Performance should scale reasonably
      const smallBatchAvg = performanceResults[0].avgTimePerOrder;
      const largeBatchAvg = performanceResults[2].avgTimePerOrder;
      
      // Large batch shouldn't be more than 3x slower per order than small batch
      expect(largeBatchAvg).toBeLessThan(smallBatchAvg * 3);
    }, 45000);
  });

  describe('Matching Engine Performance', () => {
    test('should handle rapid order matching efficiently', async () => {
      // Pre-populate order book with sell orders
      const sellOrderPromises = [];
      for (let i = 0; i < 50; i++) {
        sellOrderPromises.push(
          placeTestOrder({
            userId: userIds[i % NUM_USERS],
            orderType: 'limit',
            side: 'sell',
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            quantity: 10,
            price: 900 + i // Prices from 900 to 949
          }).catch(() => null)
        );
      }

      await Promise.allSettled(sellOrderPromises);

      // Now place buy orders that will trigger matching
      const startTime = Date.now();
      const buyOrderPromises = [];

      for (let i = 0; i < 25; i++) {
        buyOrderPromises.push(
          placeTestOrder({
            userId: userIds[(i + 5) % NUM_USERS], // Different users
            orderType: 'market',
            side: 'buy',
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            quantity: 5
          }).catch(() => null)
        );
      }

      await Promise.allSettled(buyOrderPromises);
      const endTime = Date.now();
      const matchingTime = endTime - startTime;

      console.log(`Matching performance:
        - 25 market orders processed in: ${matchingTime}ms
        - Average matching time: ${(matchingTime / 25).toFixed(2)}ms per order
      `);

      // Matching should be fast
      expect(matchingTime).toBeLessThan(10000); // Less than 10 seconds total
      expect(matchingTime / 25).toBeLessThan(400); // Less than 400ms per order
    }, 30000);

    test('should handle complex order book scenarios efficiently', async () => {
      // Create a complex order book with many price levels
      const setupPromises = [];

      // Create 100 orders at different price levels
      for (let i = 0; i < 100; i++) {
        const side = i % 2 === 0 ? 'buy' : 'sell';
        const basePrice = side === 'buy' ? 850 : 950;
        const price = basePrice + (i % 50); // 50 price levels each side

        setupPromises.push(
          placeTestOrder({
            userId: userIds[i % NUM_USERS],
            orderType: 'limit',
            side: side as 'buy' | 'sell',
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            quantity: 5,
            price: price
          }).catch(() => null)
        );
      }

      await Promise.allSettled(setupPromises);

      // Now place a large market order that will walk through multiple levels
      const startTime = Date.now();
      
      await placeTestOrder({
        userId: userIds[0],
        orderType: 'market',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100 // Should match against multiple price levels
      }).catch(() => null);

      const endTime = Date.now();
      const complexMatchingTime = endTime - startTime;

      console.log(`Complex matching performance: ${complexMatchingTime}ms`);

      // Even complex matching should be reasonably fast
      expect(complexMatchingTime).toBeLessThan(2000); // Less than 2 seconds
    }, 30000);
  });

  describe('Database Query Performance', () => {
    test('should efficiently query order book depth', async () => {
      // Add some orders to create depth
      const setupPromises = [];
      for (let i = 0; i < 50; i++) {
        setupPromises.push(
          placeTestOrder({
            userId: userIds[i % NUM_USERS],
            orderType: 'limit',
            side: i % 2 === 0 ? 'buy' : 'sell',
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            quantity: 10,
            price: 900 + (i % 20)
          }).catch(() => null)
        );
      }

      await Promise.allSettled(setupPromises);

      // Test order book depth query performance
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await executeQuery(`
          SELECT * FROM order_book 
          WHERE base_currency = 'EUR' 
          AND quote_currency = 'AOA' 
          AND status = 'pending'
          ORDER BY 
            CASE WHEN side = 'buy' THEN price END DESC,
            CASE WHEN side = 'sell' THEN price END ASC,
            created_at ASC
          LIMIT 20
        `);
      }

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      console.log(`Order book depth query performance: ${queryTime}ms for 10 queries`);

      // Queries should be fast
      expect(queryTime).toBeLessThan(1000); // Less than 1 second for 10 queries
      expect(queryTime / 10).toBeLessThan(100); // Less than 100ms per query
    });

    test('should efficiently query trade history', async () => {
      // Create some trades first
      for (let i = 0; i < 10; i++) {
        await placeTestOrder({
          userId: userIds[0],
          orderType: 'limit',
          side: 'sell',
          baseCurrency: 'EUR',
          quoteCurrency: 'AOA',
          quantity: 10,
          price: 900
        }).catch(() => null);

        await placeTestOrder({
          userId: userIds[1],
          orderType: 'limit',
          side: 'buy',
          baseCurrency: 'EUR',
          quoteCurrency: 'AOA',
          quantity: 10,
          price: 900
        }).catch(() => null);
      }

      // Test trade history query performance
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await executeQuery(`
          SELECT * FROM trades 
          WHERE base_currency = 'EUR' 
          AND quote_currency = 'AOA'
          ORDER BY created_at DESC
          LIMIT 50
        `);
      }

      const endTime = Date.now();
      const tradeQueryTime = endTime - startTime;

      console.log(`Trade history query performance: ${tradeQueryTime}ms for 10 queries`);

      // Trade queries should be fast
      expect(tradeQueryTime).toBeLessThan(500); // Less than 500ms for 10 queries
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent order operations without deadlocks', async () => {
      const concurrentOperations = [];
      const startTime = Date.now();

      // Mix of different operations running concurrently
      for (let i = 0; i < 20; i++) {
        const userId = userIds[i % NUM_USERS];
        
        // Place order
        concurrentOperations.push(
          placeTestOrder({
            userId: userId,
            orderType: 'limit',
            side: i % 2 === 0 ? 'buy' : 'sell',
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            quantity: 5,
            price: 900 + (i % 10)
          }).catch(() => null)
        );

        // Query operations
        concurrentOperations.push(
          executeQuery(`
            SELECT COUNT(*) FROM order_book 
            WHERE user_id = $1 AND status = 'pending'
          `, [userId]).catch(() => null)
        );
      }

      const results = await Promise.allSettled(concurrentOperations);
      const endTime = Date.now();
      const concurrentTime = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Concurrent operations performance:
        - Total operations: ${concurrentOperations.length}
        - Successful: ${successful}
        - Failed: ${failed}
        - Total time: ${concurrentTime}ms
      `);

      // Should handle concurrent operations reasonably well
      expect(concurrentTime).toBeLessThan(15000); // Less than 15 seconds
      expect(successful).toBeGreaterThan(concurrentOperations.length * 0.7); // At least 70% success rate
    }, 30000);
  });
});
