import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { getWalletBalance } from '@/lib/database/functions';

async function walletBalanceHandler(request: NextRequest, user: AuthenticatedUser) {
  // Get balances for all supported currencies
  const currencies = ['EUR', 'AOA'];
  const balances: Record<string, { currency: string; availableBalance: number; reservedBalance: number; totalBalance: number }> = {};

  for (const currency of currencies) {
    const result = await getWalletBalance({
      user_id: user.databaseId, // Use the database user ID from middleware
      currency
    });

    if (result.success) {
      const walletData = result.data as { available_balance?: number; reserved_balance?: number } | undefined;
      balances[currency] = {
        currency,
        availableBalance: walletData?.available_balance || 0,
        reservedBalance: walletData?.reserved_balance || 0,
        totalBalance: (walletData?.available_balance || 0) + (walletData?.reserved_balance || 0)
      };
    } else {
      // If wallet doesn't exist, return zero balances
      balances[currency] = {
        currency,
        availableBalance: 0,
        reservedBalance: 0,
        totalBalance: 0
      };
    }
  }

  const responseData = {
    userId: user.userId,
    balances,
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(responseData, 'Wallet balances retrieved successfully');
}

export const GET = withCors(withErrorHandling(withAuth(walletBalanceHandler)));
