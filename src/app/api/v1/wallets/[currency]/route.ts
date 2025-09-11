import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRouteParams } from '@/lib/validations';
import { walletCurrencySchema } from '@/lib/validations';
import { getWalletBalance } from '@/lib/database/functions';

async function currencyBalanceHandler(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: { params: Promise<{ currency: string }> }
) {
  // Validate currency parameter
  const resolvedParams = await params;
  const validation = validateRouteParams(resolvedParams, walletCurrencySchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { currency } = validation.data!;

  // Get balance for specific currency
  const result = await getWalletBalance({
    user_id: user.userId,
    currency
  });

  if (!result.success) {
    // If wallet doesn't exist, return zero balances
    const responseData = {
      userId: user.userId,
      currency,
      availableBalance: 0,
      reservedBalance: 0,
      totalBalance: 0,
      timestamp: new Date().toISOString()
    };
    return createSuccessResponse(responseData, 'Wallet balance retrieved (new wallet)');
  }

  const walletData = result.data as { available_balance?: number; reserved_balance?: number } | undefined;

  const responseData = {
    userId: user.userId,
    currency,
    availableBalance: walletData?.available_balance || 0,
    reservedBalance: walletData?.reserved_balance || 0,
    totalBalance: (walletData?.available_balance || 0) + (walletData?.reserved_balance || 0),
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(responseData, 'Wallet balance retrieved successfully');
}

export const GET = withCors(withErrorHandling(withAuth(currencyBalanceHandler)));
