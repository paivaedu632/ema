/**
 * Hook for calculating actual receive amounts with real-time data
 */

import { useMemo } from 'react';
import {
  calculateActualReceiveAmount,
  ActualReceiveAmount,
  LiquidityCheckResponse
} from '@/lib/actual-receive-calculator';
import type { LiquidityCheckResponse as ApiLiquidityCheckResponse } from '@/types';

interface UseActualReceiveAmountProps {
  fromAmount: number;
  fromCurrency: 'EUR' | 'AOA';
  toCurrency: 'EUR' | 'AOA';
  exchangeType: 'auto' | 'manual';
  exchangeRate: number;
  liquidityData?: ApiLiquidityCheckResponse | undefined;
  userSpecifiedToAmount?: number | undefined;
}

/**
 * Hook that calculates actual receive amounts accounting for all execution factors
 */
export function useActualReceiveAmount({
  fromAmount,
  fromCurrency,
  toCurrency,
  exchangeType,
  exchangeRate,
  liquidityData,
  userSpecifiedToAmount
}: UseActualReceiveAmountProps): ActualReceiveAmount {
  
  return useMemo(() => {
    // Convert liquidity data to expected format if available
    const liquidityCheckData: LiquidityCheckResponse | undefined = liquidityData ? {
      hasLiquidity: liquidityData.hasLiquidity,
      availableQuantity: liquidityData.availableQuantity,
      bestPrice: liquidityData.bestPrice,
      worstPrice: liquidityData.worstPrice,
      estimatedSlippage: liquidityData.estimatedSlippage,
      message: liquidityData.message,
      canExecuteMarketOrder: liquidityData.canExecuteMarketOrder
    } : undefined;

    return calculateActualReceiveAmount(
      fromAmount,
      fromCurrency,
      toCurrency,
      exchangeType,
      exchangeRate,
      liquidityCheckData,
      userSpecifiedToAmount
    );
  }, [
    fromAmount,
    fromCurrency,
    toCurrency,
    exchangeType,
    exchangeRate,
    liquidityData?.hasLiquidity,
    liquidityData?.availableQuantity,
    liquidityData?.bestPrice,
    liquidityData?.worstPrice,
    liquidityData?.estimatedSlippage,
    liquidityData?.canExecuteMarketOrder,
    liquidityData?.message,
    userSpecifiedToAmount
  ]);
}

/**
 * Hook for getting display-ready receive amount information
 */
export function useReceiveAmountDisplay({
  fromAmount,
  fromCurrency,
  toCurrency,
  exchangeType,
  exchangeRate,
  liquidityData,
  userSpecifiedToAmount
}: UseActualReceiveAmountProps) {
  
  const actualAmount = useActualReceiveAmount({
    fromAmount,
    fromCurrency,
    toCurrency,
    exchangeType,
    exchangeRate,
    liquidityData,
    userSpecifiedToAmount
  });

  return useMemo(() => {
    // Create user-friendly display text with positive guarantee messaging
    const guaranteedText = formatDisplayAmount(actualAmount.guaranteedMinimum, toCurrency);

    let displayText: string;
    if (!actualAmount.isExecutable) {
      // For simplified architecture, this should rarely happen
      // But keep as fallback for edge cases
      displayText = 'Não disponível';
    } else {
      // Positive guarantee messaging without warning indicators
      displayText = guaranteedText;
    }

    // Create breakdown for tooltip
    const breakdown = {
      gross: formatDisplayAmount(actualAmount.breakdown.grossAmount, toCurrency),
      fees: formatDisplayAmount(actualAmount.breakdown.fees, toCurrency),
      slippage: formatDisplayAmount(actualAmount.breakdown.slippageBuffer, toCurrency),
      net: guaranteedText
    };

    return {
      displayText,
      guaranteedAmount: actualAmount.guaranteedMinimum,
      estimatedAmount: actualAmount.estimatedAmount,
      breakdown,
      warnings: actualAmount.warnings,
      displayStyle: 'positive', // Always positive styling for guarantee messaging
      isExecutable: actualAmount.isExecutable,
      hasRisks: false, // No longer treating as risky since it's a positive guarantee
      effectiveRate: actualAmount.breakdown.effectiveRate
    };
  }, [actualAmount, toCurrency]);
}

/**
 * Format amount for display with proper Portuguese formatting
 */
function formatDisplayAmount(amount: number, currency: 'EUR' | 'AOA'): string {
  if (amount === 0) return `0 ${currency}`;
  
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: currency === 'EUR' ? 2 : 0,
    maximumFractionDigits: currency === 'EUR' ? 2 : 0,
    useGrouping: true
  }).format(amount);
  
  // Replace spaces with periods for Portuguese formatting
  return formatted.replace(/[\s\u00A0]/g, '.') + ` ${currency}`;
}
