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

export async function getUserOrderHistory(params: {
  user_id: string;
  page?: number;
  limit?: number;
}) {
  const dbParams = {
    p_user_id: params.user_id,
    p_limit: params.limit || 20,
    p_offset: ((params.page || 1) - 1) * (params.limit || 20)
  };
  return executeFunction('get_user_order_history', dbParams);
}



// Market data functions
export async function getMarketSummary(params: {
  base_currency: string;
  quote_currency: string;
}) {
  return executeFunction('get_market_summary', params);
}

export async function getOrderBookDepth(params: {
  base_currency: string;
  quote_currency: string;
  levels?: number;
}) {
  return executeFunction('get_order_book_depth', params);
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
