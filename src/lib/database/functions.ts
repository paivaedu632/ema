import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface DatabaseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a Supabase database function with error handling
 */
async function executeFunction<T>(
  functionName: string,
  params: Record<string, unknown> = {}
): Promise<DatabaseResult<T>> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error(`Database function ${functionName} error:`, error);
      return {
        success: false,
        error: error.message || 'Database operation failed'
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error(`Database function ${functionName} exception:`, error);
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}

/**
 * Execute raw SQL with parameters
 */
export async function execute_sql_supabase<T>(
  projectId: string,
  query: string,
  params: unknown[] = []
): Promise<DatabaseResult<T[]>> {
  try {
    const supabase = createServerSupabaseClient();

    // For parameterized queries, we need to use rpc with a custom function
    // For now, we'll use the check_market_liquidity function directly
    if (query.includes('check_market_liquidity')) {
      const [side, baseCurrency, quoteCurrency, quantity, maxSlippage] = params;
      const { data, error } = await supabase.rpc('check_market_liquidity', {
        p_side: side,
        p_base_currency: baseCurrency,
        p_quote_currency: quoteCurrency,
        p_quantity: quantity,
        p_max_slippage_percent: maxSlippage
      });

      if (error) {
        console.error('SQL execution error:', error);
        return {
          success: false,
          error: error.message || 'SQL execution failed'
        };
      }

      return {
        success: true,
        data: Array.isArray(data) ? data : [data]
      };
    }

    // For other queries, return error for now
    return {
      success: false,
      error: 'Raw SQL execution not supported in this context'
    };
  } catch (error) {
    console.error('SQL execution exception:', error);
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}

// User functions
export async function createUser(params: {
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}) {
  return executeFunction('create_user', params);
}

export async function findUserForTransfer(params: {
  p_identifier: string;
}) {
  return executeFunction('find_user_for_transfer', params);
}

// Wallet functions
export async function getWalletBalance(params: {
  user_id: string;
  currency?: string;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_currency: params.currency
  };
  return executeFunction('get_wallet_balance', dbParams);
}

// Transfer functions
export async function sendP2PTransfer(params: {
  sender_id: string;
  recipient_identifier: string;
  currency: string;
  amount: number;
  pin: string;
  description?: string;
}) {
  // Map parameter names to match PostgreSQL function signature
  const dbParams = {
    p_sender_id: params.sender_id,
    p_recipient_identifier: params.recipient_identifier,
    p_currency: params.currency,
    p_amount: params.amount,
    p_pin: params.pin,
    p_description: params.description
  };
  return executeFunction('send_p2p_transfer', dbParams);
}

export async function getTransferHistory(params: {
  user_id: string;
  page?: number;
  limit?: number;
  currency?: string;
}) {
  // Map parameter names to match PostgreSQL function signature
  const dbParams = {
    p_requesting_user_id: params.user_id,
    p_target_user_id: params.user_id, // Same user for own history
    p_currency: params.currency,
    p_transaction_type: null, // Get all types
    p_start_date: null, // No date filter
    p_end_date: null, // No date filter
    p_limit: params.limit || 20
  };
  return executeFunction('get_transaction_history', dbParams);
}

// Order functions
export async function placeLimitOrder(params: {
  user_id: string;
  side: 'buy' | 'sell';
  base_currency: string;
  quote_currency: string;
  quantity: number;
  price: number;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_side: params.side,
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency,
    p_quantity: params.quantity,
    p_price: params.price
  };
  return executeFunction('place_limit_order', dbParams);
}

export async function executeMarketOrder(params: {
  user_id: string;
  side: 'buy' | 'sell';
  base_currency: string;
  quote_currency: string;
  quantity: number;
  max_slippage_percent?: number;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_side: params.side,
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency,
    p_quantity: params.quantity,
    p_max_slippage_percent: params.max_slippage_percent || 5.0
  };
  return executeFunction('execute_market_order', dbParams);
}

export async function executeHybridMarketOrder(params: {
  user_id: string;
  side: 'buy' | 'sell';
  base_currency: string;
  quote_currency: string;
  quantity: number;
  max_slippage_percent?: number;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_side: params.side,
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency,
    p_quantity: params.quantity,
    p_max_slippage_percent: params.max_slippage_percent || 5.0
  };
  return executeFunction('execute_hybrid_market_order', dbParams);
}

// Market data functions
// Note: Removed getUserOrderHistory and getOrderBookDepth - endpoints removed for simplicity

export async function getMidpointExchangeRate(params: {
  base_currency: string;
  quote_currency: string;
}) {
  const dbParams = {
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency
  };
  return executeFunction('get_midpoint_exchange_rate', dbParams);
}

// Legacy function for backward compatibility - redirects to new function
export async function getCurrentMarketRate(params: {
  base_currency: string;
  quote_currency: string;
}) {
  return getMidpointExchangeRate(params);
}

export async function checkMarketLiquidity(params: {
  side: 'buy' | 'sell';
  base_currency: string;
  quote_currency: string;
  quantity: number;
  max_slippage_percent?: number;
}) {
  const dbParams = {
    p_side: params.side,
    p_base_currency: params.base_currency,
    p_quote_currency: params.quote_currency,
    p_quantity: params.quantity,
    p_max_slippage_percent: params.max_slippage_percent || 5.0
  };
  return executeFunction('check_market_liquidity', dbParams);
}

// Security functions
export async function setUserPin(params: {
  user_id: string;
  pin: string;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_pin: params.pin
  };
  return executeFunction('set_transfer_pin', dbParams);
}

export async function verifyUserPin(params: {
  user_id: string;
  pin: string;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_pin: params.pin
  };
  return executeFunction('verify_transfer_pin', dbParams);
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return {
        success: false,
        error: 'Database connection failed'
      };
    }

    return {
      success: true,
      data: { status: 'healthy', timestamp: new Date().toISOString() }
    };
  } catch {
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}
