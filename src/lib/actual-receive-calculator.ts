/**
 * Accurate receive amount calculator for EmaPay currency conversions
 * Accounts for fees, slippage, partial execution, and liquidity constraints
 */

export interface LiquidityCheckResponse {
  hasLiquidity: boolean;
  availableQuantity: number;
  bestPrice?: number;
  worstPrice?: number;
  estimatedSlippage: number;
  message: string;
  canExecuteMarketOrder: boolean;
  // Hybrid execution support
  hybridExecutionAvailable: boolean;
  partialExecutionQuantity: number;
  remainingQuantityForLimitOrder: number;
}

export interface ActualReceiveAmount {
  guaranteedMinimum: number;    // Worst-case amount user will receive
  estimatedAmount: number;      // Best-case realistic estimate
  breakdown: {
    grossAmount: number;        // Before fees/slippage
    fees: number;              // Total fees deducted
    slippageBuffer: number;    // Amount reserved for slippage protection
    availableLiquidity: number; // Maximum executable amount
    effectiveRate: number;     // Final rate after all deductions
  };
  warnings: string[];          // Risk warnings for user
  isExecutable: boolean;       // Whether order can be executed
}

// Fee structure from database (2% for trades)
const TRADING_FEES = {
  EUR: 0.02, // 2%
  AOA: 0.02  // 2%
} as const;

// Slippage protection limits
const MAX_SLIPPAGE = 0.05; // 5% maximum slippage for market orders

// Liquidity thresholds for warnings
const LIQUIDITY_THRESHOLDS = {
  LOW_LIQUIDITY_RATIO: 0.8,    // Warn if order > 80% of available liquidity
  HIGH_IMPACT_THRESHOLD: 0.02   // Warn if estimated slippage > 2%
} as const;

/**
 * Calculate the actual amount a user will receive after all execution factors
 */
export function calculateActualReceiveAmount(
  fromAmount: number,
  fromCurrency: 'EUR' | 'AOA',
  toCurrency: 'EUR' | 'AOA',
  exchangeType: 'auto' | 'manual',
  exchangeRate: number,
  liquidityData?: LiquidityCheckResponse,
  userSpecifiedToAmount?: number // For manual mode
): ActualReceiveAmount {
  
  // Input validation
  if (fromAmount <= 0 || exchangeRate <= 0) {
    return createEmptyResult('Valores inválidos fornecidos');
  }

  if (fromCurrency === toCurrency) {
    return createEmptyResult('Moedas de origem e destino devem ser diferentes');
  }

  // Calculate gross amount before any deductions
  const grossAmount = exchangeType === 'manual' && userSpecifiedToAmount 
    ? userSpecifiedToAmount 
    : fromAmount * exchangeRate;

  // Get applicable fee rate for the target currency
  const feeRate = TRADING_FEES[toCurrency];
  const fees = grossAmount * feeRate;

  // Initialize result structure
  const result: ActualReceiveAmount = {
    guaranteedMinimum: 0,
    estimatedAmount: 0,
    breakdown: {
      grossAmount,
      fees,
      slippageBuffer: 0,
      availableLiquidity: liquidityData?.availableQuantity || grossAmount,
      effectiveRate: 0
    },
    warnings: [],
    isExecutable: true
  };

  // Calculate amounts based on exchange type
  if (exchangeType === 'auto') {
    return calculateMarketOrderAmount(result, fromAmount, grossAmount, fees, liquidityData);
  } else {
    return calculateLimitOrderAmount(result, fromAmount, grossAmount, fees, liquidityData, userSpecifiedToAmount);
  }
}

/**
 * Calculate amounts for market orders (automatic mode) with hybrid execution support
 */
function calculateMarketOrderAmount(
  result: ActualReceiveAmount,
  fromAmount: number,
  grossAmount: number,
  fees: number,
  liquidityData?: LiquidityCheckResponse
): ActualReceiveAmount {

  // With hybrid execution, orders are always executable (partial + limit order)
  // Only completely reject if no liquidity exists at all
  if (liquidityData && liquidityData.availableQuantity === 0) {
    result.isExecutable = false;
    result.warnings.push('Nenhuma liquidez disponível no momento');
    return result;
  }

  // If no liquidity data, add informational message about hybrid execution
  if (!liquidityData) {
    result.warnings.push('Execução híbrida: imediata + automática conforme liquidez');
  }

  // Apply liquidity constraints for hybrid execution
  const availableLiquidity = liquidityData?.availableQuantity || grossAmount;
  const immediateExecutionAmount = Math.min(grossAmount, availableLiquidity);
  const limitOrderAmount = grossAmount - immediateExecutionAmount;

  // Calculate slippage buffer only for immediate execution portion
  const estimatedSlippage = liquidityData ? Math.min(liquidityData.estimatedSlippage / 100, MAX_SLIPPAGE) : MAX_SLIPPAGE;
  const slippageBuffer = immediateExecutionAmount * estimatedSlippage;

  // Calculate final amounts considering hybrid execution
  const immediateNetAfterFees = immediateExecutionAmount - (fees * (immediateExecutionAmount / grossAmount));
  const limitOrderNetAfterFees = limitOrderAmount - (fees * (limitOrderAmount / grossAmount));

  // Guaranteed minimum: immediate execution (with slippage protection) + limit order (exact)
  const guaranteedMinimum = Math.max(0, immediateNetAfterFees - slippageBuffer) + Math.max(0, limitOrderNetAfterFees);
  const estimatedAmount = Math.max(0, immediateNetAfterFees * (1 - estimatedSlippage * 0.3)) + Math.max(0, limitOrderNetAfterFees);

  // Update result
  result.guaranteedMinimum = guaranteedMinimum;
  result.estimatedAmount = estimatedAmount;
  result.breakdown.slippageBuffer = slippageBuffer;
  result.breakdown.availableLiquidity = availableLiquidity;
  result.breakdown.effectiveRate = guaranteedMinimum / fromAmount;

  // Add warnings based on conditions (only if liquidity data available)
  if (liquidityData) {
    addMarketOrderWarnings(result, fromAmount, grossAmount, liquidityData);
  }

  return result;
}

/**
 * Calculate amounts for limit orders (manual mode)
 */
function calculateLimitOrderAmount(
  result: ActualReceiveAmount,
  fromAmount: number,
  grossAmount: number,
  fees: number,
  liquidityData?: LiquidityCheckResponse,
  userSpecifiedToAmount?: number
): ActualReceiveAmount {

  // For limit orders, user specifies exact amount they want to receive
  // Only trading fees apply - no slippage since execution is at specified rate or not at all
  const targetAmount = userSpecifiedToAmount || grossAmount;

  // Simple calculation: target amount minus trading fees only
  const guaranteedMinimum = Math.max(0, targetAmount - fees);

  // For limit orders, estimated and guaranteed are the same (price protection)
  result.guaranteedMinimum = guaranteedMinimum;
  result.estimatedAmount = guaranteedMinimum;
  result.breakdown.grossAmount = targetAmount;
  result.breakdown.fees = fees;
  result.breakdown.slippageBuffer = 0; // No slippage for limit orders
  result.breakdown.availableLiquidity = targetAmount; // User-specified amount
  result.breakdown.effectiveRate = guaranteedMinimum / fromAmount;

  // Add simple warning for limit orders if needed
  if (liquidityData && !liquidityData.hasLiquidity) {
    result.warnings.push('Execução sujeita à disponibilidade de contrapartes no mercado');
  }

  return result;
}

/**
 * Add appropriate warnings for hybrid market orders
 */
function addMarketOrderWarnings(
  result: ActualReceiveAmount,
  fromAmount: number,
  grossAmount: number,
  liquidityData: LiquidityCheckResponse
): void {

  // Hybrid execution information
  const liquidityRatio = grossAmount / liquidityData.availableQuantity;
  if (liquidityRatio > 1) {
    const immediatePercent = ((liquidityData.availableQuantity / grossAmount) * 100).toFixed(0);
    result.warnings.push(`Execução híbrida: ${immediatePercent}% imediato, restante como ordem automática`);
  }

  // High slippage warning only for immediate execution portion
  if (liquidityData.estimatedSlippage > LIQUIDITY_THRESHOLDS.HIGH_IMPACT_THRESHOLD * 100) {
    result.warnings.push(`Deslizamento estimado na execução imediata: ${liquidityData.estimatedSlippage.toFixed(2)}%`);
  }

  // Partial execution warning
  if (grossAmount > liquidityData.availableQuantity) {
    result.warnings.push('Execução parcial: liquidez insuficiente para o valor total');
  }

  // General market order warning
  result.warnings.push('Ordem de mercado: preço final pode variar devido às condições de mercado');
}

/**
 * Add appropriate warnings for limit orders
 */
function addLimitOrderWarnings(
  result: ActualReceiveAmount,
  targetAmount: number,
  liquidityData?: LiquidityCheckResponse
): void {
  
  // Partial execution warning for limit orders
  if (liquidityData && targetAmount > liquidityData.availableQuantity) {
    result.warnings.push('Execução parcial: pode não ser totalmente executada imediatamente');
  }

  // General limit order warning
  result.warnings.push('Ordem manual: execução depende das condições de mercado atingirem o preço especificado');
}

/**
 * Create empty result for error cases
 */
function createEmptyResult(errorMessage: string): ActualReceiveAmount {
  return {
    guaranteedMinimum: 0,
    estimatedAmount: 0,
    breakdown: {
      grossAmount: 0,
      fees: 0,
      slippageBuffer: 0,
      availableLiquidity: 0,
      effectiveRate: 0
    },
    warnings: [errorMessage],
    isExecutable: false
  };
}

/**
 * Format amount for display with proper currency formatting
 */
export function formatActualAmount(amount: number, currency: 'EUR' | 'AOA'): string {
  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-AO';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'EUR' ? 2 : 0,
    maximumFractionDigits: currency === 'EUR' ? 2 : 0,
    useGrouping: true
  }).format(amount).replace(/[\s\u00A0]/g, '.') + ` ${currency}`;
}

/**
 * Generate user-friendly summary of the calculation
 */
export function generateReceiveAmountSummary(result: ActualReceiveAmount, currency: 'EUR' | 'AOA'): string {
  if (!result.isExecutable) {
    return 'Não executável no momento';
  }

  const guaranteed = formatActualAmount(result.guaranteedMinimum, currency);
  const estimated = formatActualAmount(result.estimatedAmount, currency);
  
  if (Math.abs(result.guaranteedMinimum - result.estimatedAmount) < 0.01) {
    return `Você recebe: ${guaranteed}*`;
  } else {
    return `Você recebe: ${guaranteed} - ${estimated}*`;
  }
}
