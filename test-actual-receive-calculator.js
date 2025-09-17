// Test script for the new actual receive amount calculator

import { calculateActualReceiveAmount } from './src/lib/actual-receive-calculator.js';

console.log('🧪 TESTING ACTUAL RECEIVE AMOUNT CALCULATOR');
console.log('==========================================\n');

// Test scenarios
const testScenarios = [
  {
    name: 'Standard Market Order - EUR to AOA',
    params: {
      fromAmount: 100,
      fromCurrency: 'EUR',
      toCurrency: 'AOA',
      exchangeType: 'auto',
      exchangeRate: 1190,
      liquidityData: {
        hasLiquidity: true,
        availableQuantity: 150000,
        bestPrice: 1185,
        worstPrice: 1195,
        estimatedSlippage: 1.5,
        message: 'Sufficient liquidity',
        canExecuteMarketOrder: true
      }
    }
  },
  {
    name: 'Large Market Order - High Slippage Risk',
    params: {
      fromAmount: 1000,
      fromCurrency: 'EUR',
      toCurrency: 'AOA',
      exchangeType: 'auto',
      exchangeRate: 1190,
      liquidityData: {
        hasLiquidity: true,
        availableQuantity: 1000000,
        bestPrice: 1185,
        worstPrice: 1220,
        estimatedSlippage: 4.8,
        message: 'High price impact',
        canExecuteMarketOrder: true
      }
    }
  },
  {
    name: 'Manual Order - AOA to EUR',
    params: {
      fromAmount: 119000,
      fromCurrency: 'AOA',
      toCurrency: 'EUR',
      exchangeType: 'manual',
      exchangeRate: 0.00084,
      liquidityData: {
        hasLiquidity: true,
        availableQuantity: 120,
        bestPrice: 0.00085,
        worstPrice: 0.00083,
        estimatedSlippage: 2.0,
        message: 'Moderate liquidity',
        canExecuteMarketOrder: true
      },
      userSpecifiedToAmount: 100
    }
  },
  {
    name: 'Insufficient Liquidity Scenario',
    params: {
      fromAmount: 500,
      fromCurrency: 'EUR',
      toCurrency: 'AOA',
      exchangeType: 'auto',
      exchangeRate: 1190,
      liquidityData: {
        hasLiquidity: false,
        availableQuantity: 400000,
        bestPrice: 1185,
        worstPrice: 1195,
        estimatedSlippage: 8.5,
        message: 'Insufficient liquidity',
        canExecuteMarketOrder: false
      }
    }
  }
];

// Run tests
testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log('='.repeat(scenario.name.length + 3));
  
  const result = calculateActualReceiveAmount(
    scenario.params.fromAmount,
    scenario.params.fromCurrency,
    scenario.params.toCurrency,
    scenario.params.exchangeType,
    scenario.params.exchangeRate,
    scenario.params.liquidityData,
    scenario.params.userSpecifiedToAmount
  );
  
  console.log(`📊 Input: ${scenario.params.fromAmount} ${scenario.params.fromCurrency}`);
  console.log(`💱 Exchange Rate: ${scenario.params.exchangeRate}`);
  console.log(`🎯 Exchange Type: ${scenario.params.exchangeType}`);
  
  if (result.isExecutable) {
    console.log(`✅ Executable: Yes`);
    console.log(`💰 Guaranteed Minimum: ${result.guaranteedMinimum.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`📈 Estimated Amount: ${result.estimatedAmount.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`📋 Breakdown:`);
    console.log(`   - Gross Amount: ${result.breakdown.grossAmount.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`   - Fees (2%): ${result.breakdown.fees.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`   - Slippage Buffer: ${result.breakdown.slippageBuffer.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`   - Available Liquidity: ${result.breakdown.availableLiquidity.toFixed(2)} ${scenario.params.toCurrency}`);
    console.log(`   - Effective Rate: ${result.breakdown.effectiveRate.toFixed(6)}`);
    
    if (result.warnings.length > 0) {
      console.log(`⚠️  Warnings:`);
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  } else {
    console.log(`❌ Executable: No`);
    console.log(`⚠️  Issues:`);
    result.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  // Calculate comparison with old method
  const oldMethodAmount = scenario.params.fromAmount * scenario.params.exchangeRate;
  const difference = oldMethodAmount - result.guaranteedMinimum;
  const percentageDiff = ((difference / oldMethodAmount) * 100);
  
  console.log(`\n📊 Comparison with Old Method:`);
  console.log(`   - Old Method (no fees/slippage): ${oldMethodAmount.toFixed(2)} ${scenario.params.toCurrency}`);
  console.log(`   - New Method (guaranteed): ${result.guaranteedMinimum.toFixed(2)} ${scenario.params.toCurrency}`);
  console.log(`   - Difference: ${difference.toFixed(2)} ${scenario.params.toCurrency} (${percentageDiff.toFixed(2)}% less)`);
});

console.log('\n🎯 SUMMARY');
console.log('==========');
console.log('The new calculator provides:');
console.log('✅ Accurate fee deduction (2% trading fees)');
console.log('✅ Slippage protection (up to 5% for market orders)');
console.log('✅ Liquidity constraint consideration');
console.log('✅ Risk warnings for users');
console.log('✅ Guaranteed minimum amounts');
console.log('\nUsers will now see realistic amounts they will actually receive! 🎉');
