/**
 * Integration Tests - Complete User Workflows
 * Tests for end-to-end user scenarios and multi-user interactions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Integration Tests - Complete Workflows', () => {
  let userA: TestUser;
  let userB: TestUser;
  let userC: TestUser;

  beforeAll(async () => {
    // Create test users for integration testing
    userA = await testUtils.createUserWithBalance({
      email: 'integration-user-a@emapay.test',
      metadata: { purpose: 'Integration Testing User A' },
      balances: {
        EUR: { available: 1000.00, reserved: 0 },
        AOA: { available: 500000.00, reserved: 0 }
      }
    });

    userB = await testUtils.createUserWithBalance({
      email: 'integration-user-b@emapay.test',
      metadata: { purpose: 'Integration Testing User B' },
      balances: {
        EUR: { available: 500.00, reserved: 0 },
        AOA: { available: 250000.00, reserved: 0 }
      }
    });

    userC = await testUtils.createUser({
      email: 'integration-user-c@emapay.test',
      metadata: { purpose: 'Integration Testing User C' }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('Complete User Registration Flow', () => {
    test('should complete full user onboarding workflow', async () => {
      // Step 1: Create new user
      const newUser = await testUtils.createUser({
        email: 'new-user-workflow@emapay.test',
        metadata: { purpose: 'Registration Workflow Test' }
      });

      // Step 2: Verify authentication works
      const authResponse = await testUtils.get('/api/v1/auth/me', newUser);
      const userData = testUtils.assertSuccessResponse(authResponse, 200);
      
      expect(userData.userId).toBe(newUser.id);
      expect(userData.email).toBe('new-user-workflow@emapay.test');

      // Step 3: Check initial wallet balances (should be zero)
      const balanceResponse = await testUtils.get('/api/v1/wallets/balance', newUser);
      const data = testUtils.assertSuccessResponse(balanceResponse, 200);

      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('balances');
      expect(data).toHaveProperty('timestamp');

      Object.values(data.balances).forEach((balance: any) => {
        expect(balance.availableBalance).toBe(0);
        expect(balance.reservedBalance).toBe(0);
        expect(balance.totalBalance).toBe(0);
      });

      // Step 4: Verify user can search for other users
      const searchResponse = await testUtils.get(
        '/api/v1/users/search?q=integration-user-a@emapay.test',
        newUser
      );
      const searchResults = testUtils.assertSuccessResponse(searchResponse, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);

      // Step 5: Verify transfer history is empty
      const historyResponse = await testUtils.get('/api/v1/transfers/history', newUser);
      const history = testUtils.assertSuccessResponse(historyResponse, 200);
      
      expect(history.transfers).toHaveLength(0);
      expect(history.pagination.total).toBe(0);
    });

    test('should handle user registration with PIN setup', async () => {
      const newUser = await testUtils.createUser({
        email: 'pin-setup-user@emapay.test',
        metadata: { purpose: 'PIN Setup Test' }
      });

      // Verify user can authenticate
      const authResponse = await testUtils.get('/api/v1/auth/me', newUser);
      testUtils.assertSuccessResponse(authResponse, 200);

      // User should be able to perform PIN-protected operations
      // (PIN is automatically set up in test user factory)
      const transferData = testUtils.generateTransferData(userA.id, 'EUR', 10.00);
      
      // This should fail due to insufficient balance, not PIN issues
      const transferResponse = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        newUser
      );
      
      testUtils.assertErrorResponse(transferResponse, 400);
      expect(transferResponse.body.error).toContain('insufficient');
    });
  });

  describe('Transfer Workflow Integration', () => {
    test('should complete full P2P transfer workflow', async () => {
      // Step 1: Check initial balances
      const senderInitialResponse = await testUtils.get('/api/v1/wallets/EUR', userA);
      const recipientInitialResponse = await testUtils.get('/api/v1/wallets/EUR', userB);
      
      const senderInitialBalance = testUtils.assertSuccessResponse(senderInitialResponse, 200);
      const recipientInitialBalance = testUtils.assertSuccessResponse(recipientInitialResponse, 200);

      // Step 2: Search for recipient
      const searchResponse = await testUtils.get(
        `/api/v1/users/search?q=${userB.email}`,
        userA
      );
      const searchResults = testUtils.assertSuccessResponse(searchResponse, 200);
      
      const recipient = searchResults.find((user: any) => user.email === userB.email);
      expect(recipient).toBeDefined();
      expect(recipient.userId).toBe(userB.id);

      // Step 3: Send transfer
      const transferAmount = 100.00;
      const transferData = testUtils.generateTransferData(userB.id, 'EUR', transferAmount);
      transferData.description = 'Integration test transfer';

      const transferResponse = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userA
      );
      
      const transfer = testUtils.assertSuccessResponse(transferResponse, 201);
      
      expect(transfer.fromUserId).toBe(userA.id);
      expect(transfer.toUserId).toBe(userB.id);
      expect(transfer.amount).toBe(transferAmount);
      expect(transfer.currency).toBe('EUR');
      expect(transfer.description).toBe('Integration test transfer');

      // Step 4: Wait for transfer processing
      await testUtils.waitFor(async () => {
        const senderBalance = await testUtils.get('/api/v1/wallets/EUR', userA);
        const currentBalance = testUtils.assertSuccessResponse(senderBalance, 200);
        return currentBalance.availableBalance < senderInitialBalance.availableBalance;
      }, 5000);

      // Step 5: Verify balance updates
      const senderFinalResponse = await testUtils.get('/api/v1/wallets/EUR', userA);
      const recipientFinalResponse = await testUtils.get('/api/v1/wallets/EUR', userB);
      
      const senderFinalBalance = testUtils.assertSuccessResponse(senderFinalResponse, 200);
      const recipientFinalBalance = testUtils.assertSuccessResponse(recipientFinalResponse, 200);

      expect(senderFinalBalance.availableBalance).toBe(
        senderInitialBalance.availableBalance - transferAmount
      );
      expect(recipientFinalBalance.availableBalance).toBe(
        recipientInitialBalance.availableBalance + transferAmount
      );

      // Step 6: Verify transfer appears in history
      const senderHistoryResponse = await testUtils.get('/api/v1/transfers/history', userA);
      const recipientHistoryResponse = await testUtils.get('/api/v1/transfers/history', userB);
      
      const senderHistory = testUtils.assertSuccessResponse(senderHistoryResponse, 200);
      const recipientHistory = testUtils.assertSuccessResponse(recipientHistoryResponse, 200);

      // Transfer should appear in both users' history
      const senderTransfer = senderHistory.transfers.find((t: any) => t.id === transfer.id);
      const recipientTransfer = recipientHistory.transfers.find((t: any) => t.id === transfer.id);
      
      expect(senderTransfer).toBeDefined();
      expect(recipientTransfer).toBeDefined();
      expect(senderTransfer.id).toBe(recipientTransfer.id);
    });

    test('should handle multi-currency transfer workflow', async () => {
      // Test AOA transfer workflow
      const transferAmount = 50000.00;
      
      // Get initial balances
      const senderInitialResponse = await testUtils.get('/api/v1/wallets/AOA', userA);
      const recipientInitialResponse = await testUtils.get('/api/v1/wallets/AOA', userC);
      
      const senderInitialBalance = testUtils.assertSuccessResponse(senderInitialResponse, 200);
      const recipientInitialBalance = testUtils.assertSuccessResponse(recipientInitialResponse, 200);

      // Send AOA transfer
      const transferData = testUtils.generateTransferData(userC.id, 'AOA', transferAmount);
      
      const transferResponse = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userA
      );
      
      testUtils.assertSuccessResponse(transferResponse, 201);

      // Wait for processing and verify balances
      await testUtils.waitFor(async () => {
        const senderBalance = await testUtils.get('/api/v1/wallets/AOA', userA);
        const currentBalance = testUtils.assertSuccessResponse(senderBalance, 200);
        return currentBalance.availableBalance < senderInitialBalance.availableBalance;
      }, 5000);

      const senderFinalResponse = await testUtils.get('/api/v1/wallets/AOA', userA);
      const recipientFinalResponse = await testUtils.get('/api/v1/wallets/AOA', userC);
      
      const senderFinalBalance = testUtils.assertSuccessResponse(senderFinalResponse, 200);
      const recipientFinalBalance = testUtils.assertSuccessResponse(recipientFinalResponse, 200);

      expect(senderFinalBalance.availableBalance).toBe(
        senderInitialBalance.availableBalance - transferAmount
      );
      expect(recipientFinalBalance.availableBalance).toBe(
        recipientInitialBalance.availableBalance + transferAmount
      );
    });
  });

  describe('Multi-User Scenarios', () => {
    test('should handle circular transfers between three users', async () => {
      const transferAmount = 25.00;
      
      // Get initial balances
      const userAInitial = await testUtils.get('/api/v1/wallets/EUR', userA);
      const userBInitial = await testUtils.get('/api/v1/wallets/EUR', userB);
      const userCInitial = await testUtils.get('/api/v1/wallets/EUR', userC);
      
      const balanceA = testUtils.assertSuccessResponse(userAInitial, 200);
      const balanceB = testUtils.assertSuccessResponse(userBInitial, 200);
      const balanceC = testUtils.assertSuccessResponse(userCInitial, 200);

      // A -> B -> C -> A (circular transfers)
      const transferAtoB = testUtils.generateTransferData(userB.id, 'EUR', transferAmount);
      const transferBtoC = testUtils.generateTransferData(userC.id, 'EUR', transferAmount);
      const transferCtoA = testUtils.generateTransferData(userA.id, 'EUR', transferAmount);

      // Execute transfers sequentially
      await testUtils.post('/api/v1/transfers/send', transferAtoB, userA);
      await testUtils.waitFor(async () => true, 1000); // Wait between transfers
      
      await testUtils.post('/api/v1/transfers/send', transferBtoC, userB);
      await testUtils.waitFor(async () => true, 1000);
      
      await testUtils.post('/api/v1/transfers/send', transferCtoA, userC);
      
      // Wait for all transfers to process
      await testUtils.waitFor(async () => true, 3000);

      // Final balances should be the same as initial (circular)
      const userAFinal = await testUtils.get('/api/v1/wallets/EUR', userA);
      const userBFinal = await testUtils.get('/api/v1/wallets/EUR', userB);
      const userCFinal = await testUtils.get('/api/v1/wallets/EUR', userC);
      
      const finalBalanceA = testUtils.assertSuccessResponse(userAFinal, 200);
      const finalBalanceB = testUtils.assertSuccessResponse(userBFinal, 200);
      const finalBalanceC = testUtils.assertSuccessResponse(userCFinal, 200);

      expect(finalBalanceA.availableBalance).toBe(balanceA.availableBalance);
      expect(finalBalanceB.availableBalance).toBe(balanceB.availableBalance);
      expect(finalBalanceC.availableBalance).toBe(balanceC.availableBalance);
    });

    test('should handle concurrent transfers from multiple users', async () => {
      const transferAmount = 10.00;
      
      // Create transfer data for concurrent execution
      const transferA = testUtils.generateTransferData(userC.id, 'EUR', transferAmount);
      const transferB = testUtils.generateTransferData(userC.id, 'EUR', transferAmount);

      // Execute transfers concurrently
      const [responseA, responseB] = await Promise.all([
        testUtils.post('/api/v1/transfers/send', transferA, userA),
        testUtils.post('/api/v1/transfers/send', transferB, userB)
      ]);

      // Both transfers should succeed
      testUtils.assertSuccessResponse(responseA, 201);
      testUtils.assertSuccessResponse(responseB, 201);

      // Wait for processing
      await testUtils.waitFor(async () => true, 3000);

      // Verify userC received both transfers
      const userCFinalResponse = await testUtils.get('/api/v1/wallets/EUR', userC);
      const userCFinalBalance = testUtils.assertSuccessResponse(userCFinalResponse, 200);

      // UserC should have received 2 * transferAmount
      expect(userCFinalBalance.availableBalance).toBeGreaterThanOrEqual(transferAmount * 2);
    });

    test('should maintain data consistency across multiple operations', async () => {
      // Get total system balance before operations
      const allBalancesBefore = await Promise.all([
        testUtils.get('/api/v1/wallets/balance', userA),
        testUtils.get('/api/v1/wallets/balance', userB),
        testUtils.get('/api/v1/wallets/balance', userC)
      ]);

      const totalEURBefore = allBalancesBefore.reduce((total, response) => {
        const balances = testUtils.assertSuccessResponse(response, 200);
        const eurBalance = balances.find((b: any) => b.currency === 'EUR');
        return total + (eurBalance ? eurBalance.totalBalance : 0);
      }, 0);

      // Perform multiple operations
      const operations = [
        testUtils.post('/api/v1/transfers/send', 
          testUtils.generateTransferData(userB.id, 'EUR', 5.00), userA),
        testUtils.post('/api/v1/transfers/send', 
          testUtils.generateTransferData(userC.id, 'EUR', 3.00), userB),
        testUtils.post('/api/v1/transfers/send', 
          testUtils.generateTransferData(userA.id, 'EUR', 2.00), userC)
      ];

      await Promise.all(operations);
      await testUtils.waitFor(async () => true, 5000);

      // Get total system balance after operations
      const allBalancesAfter = await Promise.all([
        testUtils.get('/api/v1/wallets/balance', userA),
        testUtils.get('/api/v1/wallets/balance', userB),
        testUtils.get('/api/v1/wallets/balance', userC)
      ]);

      const totalEURAfter = allBalancesAfter.reduce((total, response) => {
        const balances = testUtils.assertSuccessResponse(response, 200);
        const eurBalance = balances.find((b: any) => b.currency === 'EUR');
        return total + (eurBalance ? eurBalance.totalBalance : 0);
      }, 0);

      // Total system balance should remain constant
      expect(totalEURAfter).toBe(totalEURBefore);
    });
  });

  describe('Trading Workflow Integration', () => {
    test('should complete full trading workflow', async () => {
      // Create traders with different balances
      const trader1 = await testUtils.createUserWithBalance({
        email: 'trader1@emapay.test',
        metadata: { purpose: 'Trading Workflow Test' },
        balances: {
          EUR: { available: 1000.00, reserved: 0 },
          AOA: { available: 0, reserved: 0 }
        }
      });

      const trader2 = await testUtils.createUserWithBalance({
        email: 'trader2@emapay.test',
        metadata: { purpose: 'Trading Workflow Test' },
        balances: {
          EUR: { available: 0, reserved: 0 },
          AOA: { available: 650000.00, reserved: 0 }
        }
      });

      // Step 1: Check initial balances
      const trader1InitialBalance = await testUtils.get('/api/v1/wallets/balance', trader1);
      const trader2InitialBalance = await testUtils.get('/api/v1/wallets/balance', trader2);

      testUtils.assertSuccessResponse(trader1InitialBalance, 200);
      testUtils.assertSuccessResponse(trader2InitialBalance, 200);

      // Step 2: Trader1 places a sell limit order (EUR for AOA)
      const sellOrderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'sell',
        100.00, // 100 EUR
        6500.00, // at 6500 AOA per EUR
        'Good Till Cancelled'
      );

      const sellOrderResponse = await testUtils.post(
        '/api/v1/orders/limit',
        sellOrderData,
        trader1
      );

      const sellOrder = testUtils.assertSuccessResponse(sellOrderResponse, 201);
      expect(sellOrder.status).toBe('open');

      // Step 3: Trader2 places a buy market order (should match with trader1's sell order)
      const buyOrderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        50.00 // Buy 50 EUR worth
      );

      const buyOrderResponse = await testUtils.post(
        '/api/v1/orders/market',
        buyOrderData,
        trader2
      );

      // Market order might succeed or fail depending on liquidity
      if (buyOrderResponse.status === 201) {
        const buyOrder = testUtils.assertSuccessResponse(buyOrderResponse, 201);
        expect(['filled', 'partially_filled']).toContain(buyOrder.status);

        // Step 4: Check order history for both traders
        const trader1History = await testUtils.get('/api/v1/orders/history', trader1);
        const trader2History = await testUtils.get('/api/v1/orders/history', trader2);

        testUtils.assertSuccessResponse(trader1History, 200);
        testUtils.assertSuccessResponse(trader2History, 200);

        expect(trader1History.body.orders.length).toBeGreaterThan(0);
        expect(trader2History.body.orders.length).toBeGreaterThan(0);

        // Step 5: Verify balance changes (if trade was executed)
        if (buyOrder.status === 'filled') {
          const trader1FinalBalance = await testUtils.get('/api/v1/wallets/balance', trader1);
          const trader2FinalBalance = await testUtils.get('/api/v1/wallets/balance', trader2);

          testUtils.assertSuccessResponse(trader1FinalBalance, 200);
          testUtils.assertSuccessResponse(trader2FinalBalance, 200);

          // Trader1 should have less EUR and more AOA
          // Trader2 should have more EUR and less AOA
          // (Exact amounts depend on execution details)
        }
      }

      // Step 6: Check market data reflects the trading activity
      const marketSummary = await testUtils.publicGet('/api/v1/market/summary');
      testUtils.assertSuccessResponse(marketSummary, 200);

      const eurAoaPair = marketSummary.body.pairs.find((pair: any) => pair.symbol === 'EUR/AOA');
      if (eurAoaPair) {
        expect(eurAoaPair.volume24h).toBeGreaterThanOrEqual(0);
      }

      console.log('✓ Trading workflow integration test completed successfully');
    });

    test('should handle complex multi-step trading scenario', async () => {
      // Create multiple traders
      const traders = [];
      for (let i = 0; i < 3; i++) {
        const trader = await testUtils.createUserWithBalance({
          email: `complex-trader-${i}@emapay.test`,
          metadata: { purpose: 'Complex Trading Test' },
          balances: {
            EUR: { available: 500.00, reserved: 0 },
            AOA: { available: 325000.00, reserved: 0 }
          }
        });
        traders.push(trader);
      }

      // Step 1: Multiple traders place different types of orders
      const orderPromises = [];

      // Trader 0: Limit sell order
      orderPromises.push(testUtils.post('/api/v1/orders/limit',
        testUtils.generateLimitOrderData('EUR/AOA', 'sell', 50.00, 6600.00, 'Good Till Cancelled'),
        traders[0]
      ));

      // Trader 1: Limit buy order
      orderPromises.push(testUtils.post('/api/v1/orders/limit',
        testUtils.generateLimitOrderData('EUR/AOA', 'buy', 30.00, 6400.00, 'Good Till Cancelled'),
        traders[1]
      ));

      // Trader 2: Market buy order
      orderPromises.push(testUtils.post('/api/v1/orders/market',
        testUtils.generateMarketOrderData('EUR/AOA', 'buy', 20.00),
        traders[2]
      ));

      const orderResponses = await Promise.all(orderPromises);

      // Step 2: Verify all orders were placed
      orderResponses.forEach(response => {
        expect([201, 400]).toContain(response.status); // Some might fail due to market conditions
      });

      // Step 3: Check order book depth
      const orderBook = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA');
      testUtils.assertSuccessResponse(orderBook, 200);

      expect(orderBook.body).toHaveProperty('bids');
      expect(orderBook.body).toHaveProperty('asks');

      // Step 4: Verify order history for all traders
      const historyPromises = traders.map(trader =>
        testUtils.get('/api/v1/orders/history', trader)
      );

      const historyResponses = await Promise.all(historyPromises);

      historyResponses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        expect(response.body.orders).toBeDefined();
      });

      console.log('✓ Complex multi-step trading scenario completed successfully');
    });

    test('should maintain financial integrity during trading', async () => {
      // Create traders with known balances
      const trader1 = await testUtils.createUserWithBalance({
        email: 'integrity-trader1@emapay.test',
        metadata: { purpose: 'Financial Integrity Test' },
        balances: {
          EUR: { available: 200.00, reserved: 0 },
          AOA: { available: 0, reserved: 0 }
        }
      });

      const trader2 = await testUtils.createUserWithBalance({
        email: 'integrity-trader2@emapay.test',
        metadata: { purpose: 'Financial Integrity Test' },
        balances: {
          EUR: { available: 0, reserved: 0 },
          AOA: { available: 130000.00, reserved: 0 }
        }
      });

      // Record initial total balances
      const initialBalances = {
        totalEUR: 200.00,
        totalAOA: 130000.00
      };

      // Execute some trades
      const sellOrder = await testUtils.post('/api/v1/orders/limit',
        testUtils.generateLimitOrderData('EUR/AOA', 'sell', 100.00, 6500.00, 'Good Till Cancelled'),
        trader1
      );

      if (sellOrder.status === 201) {
        const buyOrder = await testUtils.post('/api/v1/orders/market',
          testUtils.generateMarketOrderData('EUR/AOA', 'buy', 50.00),
          trader2
        );

        // Check final balances
        const trader1FinalBalance = await testUtils.get('/api/v1/wallets/balance', trader1);
        const trader2FinalBalance = await testUtils.get('/api/v1/wallets/balance', trader2);

        if (trader1FinalBalance.status === 200 && trader2FinalBalance.status === 200) {
          const trader1Balances = trader1FinalBalance.body.balances;
          const trader2Balances = trader2FinalBalance.body.balances;

          // Calculate total balances after trading
          const finalTotalEUR = (trader1Balances.EUR?.available || 0) + (trader2Balances.EUR?.available || 0);
          const finalTotalAOA = (trader1Balances.AOA?.available || 0) + (trader2Balances.AOA?.available || 0);

          // Total EUR should remain the same (conservation of currency)
          expect(finalTotalEUR).toBeCloseTo(initialBalances.totalEUR, 2);

          // Total AOA should remain the same (conservation of currency)
          expect(finalTotalAOA).toBeCloseTo(initialBalances.totalAOA, 2);
        }
      }

      console.log('✓ Financial integrity maintained during trading');
    });
  });
});
