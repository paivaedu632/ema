import { 
  executeQuery,
  tableExists,
  functionExists 
} from '../setup';

describe('Database Schema Validation', () => {
  describe('Core Tables', () => {
    const requiredTables = [
      'users',
      'wallets', 
      'transactions',
      'order_book',
      'trades',
      'fund_reservations'
    ];

    test.each(requiredTables)('should have %s table', async (tableName) => {
      const exists = await tableExists(tableName);
      expect(exists).toBe(true);
    });

    test('should have correct order_book table structure', async () => {
      const columns = await executeQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'order_book' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      const expectedColumns = [
        'id', 'user_id', 'order_type', 'side', 'base_currency', 
        'quote_currency', 'quantity', 'price', 'filled_quantity', 
        'status', 'created_at', 'updated_at'
      ];

      const actualColumns = columns.map(col => col.column_name);
      
      for (const expectedCol of expectedColumns) {
        expect(actualColumns).toContain(expectedCol);
      }
    });

    test('should have correct trades table structure', async () => {
      const columns = await executeQuery(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'trades' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      const expectedColumns = [
        'id', 'buy_order_id', 'sell_order_id', 'buyer_id', 'seller_id',
        'base_currency', 'quote_currency', 'quantity', 'price', 'total_amount',
        'created_at'
      ];

      const actualColumns = columns.map(col => col.column_name);
      
      for (const expectedCol of expectedColumns) {
        expect(actualColumns).toContain(expectedCol);
      }
    });

    test('should have correct fund_reservations table structure', async () => {
      const columns = await executeQuery(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'fund_reservations' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      const expectedColumns = [
        'id', 'user_id', 'currency', 'amount', 'reference_id', 
        'status', 'created_at', 'updated_at'
      ];

      const actualColumns = columns.map(col => col.column_name);
      
      for (const expectedCol of expectedColumns) {
        expect(actualColumns).toContain(expectedCol);
      }
    });
  });

  describe('Foreign Key Constraints', () => {
    test('should have proper foreign key relationships', async () => {
      const foreignKeys = await executeQuery(`
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      // Check that key relationships exist
      const relationships = foreignKeys.map(fk => 
        `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`
      );

      // Expected relationships
      const expectedRelationships = [
        'order_book.user_id -> users.id',
        'trades.buyer_id -> users.id',
        'trades.seller_id -> users.id',
        'trades.buy_order_id -> order_book.id',
        'trades.sell_order_id -> order_book.id',
        'fund_reservations.user_id -> users.id',
        'wallets.user_id -> users.id'
      ];

      for (const expected of expectedRelationships) {
        expect(relationships).toContain(expected);
      }
    });
  });

  describe('Indexes and Performance', () => {
    test('should have essential indexes for order book performance', async () => {
      const indexes = await executeQuery(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename IN ('order_book', 'trades', 'wallets')
        ORDER BY tablename, indexname
      `);

      const indexNames = indexes.map(idx => idx.indexname);

      // Check for essential indexes (these may vary based on actual implementation)
      const essentialPatterns = [
        /order_book.*user_id/,
        /order_book.*status/,
        /order_book.*currency/,
        /trades.*created_at/,
        /wallets.*user_id/
      ];

      for (const pattern of essentialPatterns) {
        const hasMatchingIndex = indexNames.some(name => pattern.test(name));
        expect(hasMatchingIndex).toBe(true);
      }
    });
  });

  describe('Check Constraints', () => {
    test('should have proper check constraints', async () => {
      const constraints = await executeQuery(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'CHECK'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      // Should have constraints for important validations
      const constraintClauses = constraints.map(c => c.check_clause.toLowerCase());
      
      // Look for quantity/amount constraints (flexible matching)
      const hasQuantityConstraints = constraintClauses.some(clause =>
        clause.includes('quantity') && (clause.includes('> 0') || clause.includes('> (0)'))
      );

      const hasAmountConstraints = constraintClauses.some(clause =>
        clause.includes('amount') && (clause.includes('> 0') || clause.includes('> (0)'))
      );

      // At least some positive value constraints should exist
      expect(hasQuantityConstraints || hasAmountConstraints).toBe(true);
    });
  });

  describe('Required Functions', () => {
    const requiredFunctions = [
      'place_order',
      'cancel_order', 
      'match_order',
      'execute_trade_enhanced',
      'create_fund_reservation',
      'release_fund_reservation',
      'cancel_fund_reservation',
      'get_best_prices'
    ];

    test.each(requiredFunctions)('should have %s function', async (functionName) => {
      const exists = await functionExists(functionName);
      expect(exists).toBe(true);
    });

    test('should have functions with correct parameter counts', async () => {
      const functionInfo = await executeQuery(`
        SELECT 
          routine_name,
          routine_type,
          data_type as return_type,
          (
            SELECT COUNT(*)
            FROM information_schema.parameters p
            WHERE p.specific_name = r.specific_name
            AND p.parameter_mode = 'IN'
          ) as parameter_count
        FROM information_schema.routines r
        WHERE routine_schema = 'public'
        AND routine_name IN (
          'place_order', 'cancel_order', 'match_order', 'execute_trade_enhanced',
          'create_fund_reservation', 'release_fund_reservation'
        )
        ORDER BY routine_name
      `);

      // Verify functions exist and have reasonable parameter counts
      expect(functionInfo.length).toBeGreaterThan(0);
      
      for (const func of functionInfo) {
        const paramCount = parseInt(func.parameter_count);
        expect(paramCount).toBeGreaterThan(0);
        expect(paramCount).toBeLessThan(20); // Reasonable upper bound
      }
    });
  });

  describe('Data Types and Precision', () => {
    test('should use appropriate data types for financial data', async () => {
      const financialColumns = await executeQuery(`
        SELECT 
          table_name,
          column_name,
          data_type,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name IN ('quantity', 'price', 'amount', 'total_amount', 'available_balance', 'reserved_balance')
        ORDER BY table_name, column_name
      `);

      for (const col of financialColumns) {
        // Financial columns should use NUMERIC or DECIMAL for precision
        expect(['numeric', 'decimal'].includes(col.data_type.toLowerCase())).toBe(true);
        
        // Should have reasonable precision
        if (col.numeric_precision) {
          const precision = parseInt(col.numeric_precision);
          expect(precision).toBeGreaterThanOrEqual(10);
          expect(precision).toBeLessThan(40);
        }
      }
    });

    test('should use UUID for ID columns', async () => {
      const idColumns = await executeQuery(`
        SELECT 
          table_name,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'id'
        ORDER BY table_name
      `);

      for (const col of idColumns) {
        expect(col.data_type).toBe('uuid');
      }
    });
  });

  describe('Enum Types and Constraints', () => {
    test('should have proper enum constraints for order types', async () => {
      // Check if order_type has proper constraints
      const orderTypeConstraints = await executeQuery(`
        SELECT 
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'order_book'
        AND tc.table_schema = 'public'
        AND cc.check_clause ILIKE '%order_type%'
      `);

      if (orderTypeConstraints.length > 0) {
        const clause = orderTypeConstraints[0].check_clause.toLowerCase();
        expect(clause).toMatch(/(market|limit)/);
      }
    });

    test('should have proper enum constraints for order sides', async () => {
      const sideConstraints = await executeQuery(`
        SELECT 
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'order_book'
        AND tc.table_schema = 'public'
        AND cc.check_clause ILIKE '%side%'
      `);

      if (sideConstraints.length > 0) {
        const clause = sideConstraints[0].check_clause.toLowerCase();
        expect(clause).toMatch(/(buy|sell)/);
      }
    });
  });

  describe('Default Values and Timestamps', () => {
    test('should have proper default values for timestamps', async () => {
      const timestampColumns = await executeQuery(`
        SELECT 
          table_name,
          column_name,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at')
        AND column_default IS NOT NULL
        ORDER BY table_name, column_name
      `);

      for (const col of timestampColumns) {
        // Should have NOW() or similar default
        expect(col.column_default.toLowerCase()).toMatch(/(now\(\)|current_timestamp)/);
      }
    });

    test('should have proper default values for status columns', async () => {
      const statusColumns = await executeQuery(`
        SELECT 
          table_name,
          column_name,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'status'
        AND column_default IS NOT NULL
        ORDER BY table_name
      `);

      // Status columns should have reasonable defaults
      for (const col of statusColumns) {
        expect(col.column_default).toBeDefined();
        expect(col.column_default.length).toBeGreaterThan(0);
      }
    });
  });
});
