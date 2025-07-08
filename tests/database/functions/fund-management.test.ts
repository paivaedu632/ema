import { 
  createTestUser, 
  createTestWallet, 
  getWalletBalance,
  executeQuery,
  functionExists 
} from '../setup';

describe('Fund Management Functions', () => {
  let testUserId: string;

  beforeEach(async () => {
    testUserId = await createTestUser();
    await createTestWallet(testUserId, 'EUR', 1000);
    await createTestWallet(testUserId, 'AOA', 500000);
  });

  describe('create_fund_reservation function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('create_fund_reservation');
      expect(exists).toBe(true);
    });

    test('should create fund reservation and update wallet', async () => {
      const initialBalance = await getWalletBalance(testUserId, 'EUR');
      
      const result = await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 100, 'test_order_123') as reservation_id
      `, [testUserId]);

      const reservationId = result[0].reservation_id;
      expect(reservationId).toBeDefined();

      // Check wallet balance updated
      const finalBalance = await getWalletBalance(testUserId, 'EUR');
      expect(finalBalance.available).toBe(initialBalance.available - 100);
      expect(finalBalance.reserved).toBe(initialBalance.reserved + 100);

      // Check reservation record created
      const reservations = await executeQuery(`
        SELECT * FROM fund_reservations WHERE id = $1
      `, [reservationId]);

      expect(reservations.length).toBe(1);
      const reservation = reservations[0];
      expect(reservation.user_id).toBe(testUserId);
      expect(reservation.currency).toBe('EUR');
      expect(parseFloat(reservation.amount)).toBe(100);
      expect(reservation.reference_id).toBe('test_order_123');
      expect(reservation.status).toBe('active');
    });

    test('should reject reservation with insufficient balance', async () => {
      await expect(executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 2000, 'test_order_456')
      `, [testUserId])).rejects.toThrow();
    });

    test('should reject reservation with negative amount', async () => {
      await expect(executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', -100, 'test_order_789')
      `, [testUserId])).rejects.toThrow();
    });

    test('should reject reservation with invalid currency', async () => {
      await expect(executeQuery(`
        SELECT create_fund_reservation($1, 'USD', 100, 'test_order_101')
      `, [testUserId])).rejects.toThrow();
    });
  });

  describe('release_fund_reservation function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('release_fund_reservation');
      expect(exists).toBe(true);
    });

    test('should release fund reservation and restore wallet balance', async () => {
      // Create reservation first
      const result = await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 150, 'test_order_release') as reservation_id
      `, [testUserId]);

      const reservationId = result[0].reservation_id;
      const balanceAfterReservation = await getWalletBalance(testUserId, 'EUR');

      // Release reservation
      await executeQuery(`
        SELECT release_fund_reservation($1)
      `, [reservationId]);

      // Check wallet balance restored
      const finalBalance = await getWalletBalance(testUserId, 'EUR');
      expect(finalBalance.available).toBe(balanceAfterReservation.available + 150);
      expect(finalBalance.reserved).toBe(balanceAfterReservation.reserved - 150);

      // Check reservation status updated
      const reservations = await executeQuery(`
        SELECT * FROM fund_reservations WHERE id = $1
      `, [reservationId]);

      expect(reservations[0].status).toBe('released');
    });

    test('should reject release of non-existent reservation', async () => {
      const fakeReservationId = '00000000-0000-0000-0000-000000000000';
      
      await expect(executeQuery(`
        SELECT release_fund_reservation($1)
      `, [fakeReservationId])).rejects.toThrow();
    });

    test('should reject release of already released reservation', async () => {
      // Create and release reservation
      const result = await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 100, 'test_double_release') as reservation_id
      `, [testUserId]);

      const reservationId = result[0].reservation_id;
      
      // First release should succeed
      await executeQuery(`
        SELECT release_fund_reservation($1)
      `, [reservationId]);

      // Second release should fail
      await expect(executeQuery(`
        SELECT release_fund_reservation($1)
      `, [reservationId])).rejects.toThrow();
    });
  });

  describe('cancel_fund_reservation function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('cancel_fund_reservation');
      expect(exists).toBe(true);
    });

    test('should cancel fund reservation and restore balance', async () => {
      // Create reservation
      const result = await executeQuery(`
        SELECT create_fund_reservation($1, 'AOA', 50000, 'test_order_cancel') as reservation_id
      `, [testUserId]);

      const reservationId = result[0].reservation_id;
      const balanceAfterReservation = await getWalletBalance(testUserId, 'AOA');

      // Cancel reservation
      await executeQuery(`
        SELECT cancel_fund_reservation($1)
      `, [reservationId]);

      // Check wallet balance restored
      const finalBalance = await getWalletBalance(testUserId, 'AOA');
      expect(finalBalance.available).toBe(balanceAfterReservation.available + 50000);
      expect(finalBalance.reserved).toBe(balanceAfterReservation.reserved - 50000);

      // Check reservation status updated
      const reservations = await executeQuery(`
        SELECT * FROM fund_reservations WHERE id = $1
      `, [reservationId]);

      expect(reservations[0].status).toBe('cancelled');
    });
  });

  describe('Balance consistency checks', () => {
    test('should maintain balance consistency across operations', async () => {
      const initialBalance = await getWalletBalance(testUserId, 'EUR');
      const totalInitial = initialBalance.available + initialBalance.reserved;

      // Create multiple reservations
      const reservation1 = await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 100, 'test_consistency_1') as reservation_id
      `, [testUserId]);

      const reservation2 = await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 200, 'test_consistency_2') as reservation_id
      `, [testUserId]);

      const balanceAfterReservations = await getWalletBalance(testUserId, 'EUR');
      const totalAfterReservations = balanceAfterReservations.available + balanceAfterReservations.reserved;

      // Total should remain the same
      expect(totalAfterReservations).toBe(totalInitial);
      expect(balanceAfterReservations.reserved).toBe(initialBalance.reserved + 300);

      // Release one reservation
      await executeQuery(`
        SELECT release_fund_reservation($1)
      `, [reservation1[0].reservation_id]);

      const balanceAfterRelease = await getWalletBalance(testUserId, 'EUR');
      const totalAfterRelease = balanceAfterRelease.available + balanceAfterRelease.reserved;

      expect(totalAfterRelease).toBe(totalInitial);
      expect(balanceAfterRelease.reserved).toBe(initialBalance.reserved + 200);

      // Cancel remaining reservation
      await executeQuery(`
        SELECT cancel_fund_reservation($1)
      `, [reservation2[0].reservation_id]);

      const finalBalance = await getWalletBalance(testUserId, 'EUR');
      const totalFinal = finalBalance.available + finalBalance.reserved;

      expect(totalFinal).toBe(totalInitial);
      expect(finalBalance.reserved).toBe(initialBalance.reserved);
      expect(finalBalance.available).toBe(initialBalance.available);
    });

    test('should prevent double-spending through reservations', async () => {
      // Try to reserve more than available in multiple operations
      await executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 600, 'test_double_spend_1')
      `, [testUserId]);

      // This should fail as it would exceed available balance
      await expect(executeQuery(`
        SELECT create_fund_reservation($1, 'EUR', 500, 'test_double_spend_2')
      `, [testUserId])).rejects.toThrow();
    });

    test('should handle concurrent reservation attempts', async () => {
      // Simulate concurrent reservations (this is a simplified test)
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          executeQuery(`
            SELECT create_fund_reservation($1, 'EUR', 200, $2) as reservation_id
          `, [testUserId, `concurrent_test_${i}`])
        );
      }

      // Some should succeed, some should fail due to insufficient balance
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should have some successes and some failures
      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
      expect(successful + failed).toBe(5);

      // Total reserved should not exceed available balance
      const finalBalance = await getWalletBalance(testUserId, 'EUR');
      expect(finalBalance.reserved).toBeLessThanOrEqual(1000);
    });
  });
});
