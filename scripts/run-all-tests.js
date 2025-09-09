#!/usr/bin/env node

/**
 * Comprehensive Test Runner for EmaPay API
 * Runs all test suites and generates summary report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test configuration
const testConfig = {
  unit: {
    name: 'Unit Tests',
    pattern: 'tests/unit/**/*.test.ts',
    timeout: 30000,
    description: 'Individual endpoint and component tests'
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.ts',
    timeout: 60000,
    description: 'End-to-end workflow and multi-user scenario tests'
  },
  e2e: {
    name: 'End-to-End Tests',
    pattern: 'tests/e2e/**/*.test.ts',
    timeout: 120000,
    description: 'Complete application flow tests'
  }
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: {}
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSubHeader(message) {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`  ${message}`, 'blue');
  log('-'.repeat(40), 'blue');
}

function checkPrerequisites() {
  logHeader('CHECKING PREREQUISITES');
  
  try {
    // Check if Jest is installed
    execSync('npx jest --version', { stdio: 'pipe' });
    log('✓ Jest is installed', 'green');
    
    // Check if test files exist
    const testDirs = ['tests/unit', 'tests/integration', 'tests/utils'];
    testDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        log(`✓ ${dir} directory exists`, 'green');
      } else {
        log(`✗ ${dir} directory missing`, 'red');
        throw new Error(`Missing test directory: ${dir}`);
      }
    });
    
    // Check environment variables
    if (process.env.NODE_ENV !== 'test') {
      log('⚠ NODE_ENV is not set to "test"', 'yellow');
      process.env.NODE_ENV = 'test';
      log('✓ NODE_ENV set to "test"', 'green');
    } else {
      log('✓ NODE_ENV is set to "test"', 'green');
    }
    
    // Check if .env.test exists
    if (fs.existsSync('.env.test')) {
      log('✓ .env.test file exists', 'green');
    } else {
      log('⚠ .env.test file not found', 'yellow');
    }
    
    log('\n✓ All prerequisites met', 'green');
    
  } catch (error) {
    log(`✗ Prerequisites check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function runTestSuite(suiteKey, config) {
  logSubHeader(`Running ${config.name}`);
  log(`Description: ${config.description}`, 'cyan');
  log(`Pattern: ${config.pattern}`, 'cyan');
  log(`Timeout: ${config.timeout}ms`, 'cyan');
  
  try {
    const startTime = Date.now();
    
    // Build Jest command
    const jestCommand = [
      'npx jest',
      `--testPathPattern="${config.pattern}"`,
      `--testTimeout=${config.timeout}`,
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      '--json'
    ].join(' ');
    
    log(`\nExecuting: ${jestCommand}`, 'blue');
    
    // Run tests and capture output
    const output = execSync(jestCommand, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Parse Jest JSON output
    const results = JSON.parse(output);
    
    // Update test results
    testResults.suites[suiteKey] = {
      name: config.name,
      duration,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      success: results.success
    };
    
    testResults.total += results.numTotalTests;
    testResults.passed += results.numPassedTests;
    testResults.failed += results.numFailedTests;
    testResults.skipped += results.numPendingTests;
    
    // Log results
    if (results.success) {
      log(`\n✓ ${config.name} completed successfully`, 'green');
    } else {
      log(`\n✗ ${config.name} failed`, 'red');
    }
    
    log(`  Tests: ${results.numTotalTests}`, 'cyan');
    log(`  Passed: ${results.numPassedTests}`, 'green');
    log(`  Failed: ${results.numFailedTests}`, results.numFailedTests > 0 ? 'red' : 'cyan');
    log(`  Skipped: ${results.numPendingTests}`, results.numPendingTests > 0 ? 'yellow' : 'cyan');
    log(`  Duration: ${duration}ms`, 'cyan');
    
    return results.success;
    
  } catch (error) {
    log(`\n✗ ${config.name} failed with error:`, 'red');
    log(error.message, 'red');
    
    testResults.suites[suiteKey] = {
      name: config.name,
      duration: 0,
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      success: false,
      error: error.message
    };
    
    testResults.failed += 1;
    return false;
  }
}

function generateReport() {
  logHeader('TEST EXECUTION SUMMARY');
  
  const totalDuration = Object.values(testResults.suites)
    .reduce((total, suite) => total + suite.duration, 0);
  
  log(`Total Tests: ${testResults.total}`, 'bright');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Skipped: ${testResults.skipped}`, testResults.skipped > 0 ? 'yellow' : 'cyan');
  log(`Total Duration: ${totalDuration}ms`, 'cyan');
  
  const successRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(1)
    : 0;
  log(`Success Rate: ${successRate}%`, successRate >= 95 ? 'green' : 'yellow');
  
  logSubHeader('Suite Breakdown');
  
  Object.entries(testResults.suites).forEach(([key, suite]) => {
    const status = suite.success ? '✓' : '✗';
    const statusColor = suite.success ? 'green' : 'red';
    
    log(`${status} ${suite.name}`, statusColor);
    log(`  Tests: ${suite.numTotalTests} | Passed: ${suite.numPassedTests} | Failed: ${suite.numFailedTests}`, 'cyan');
    log(`  Duration: ${suite.duration}ms`, 'cyan');
    
    if (suite.error) {
      log(`  Error: ${suite.error}`, 'red');
    }
  });
  
  // Generate JSON report
  const reportPath = path.join(process.cwd(), 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📊 Detailed report saved to: ${reportPath}`, 'blue');
  
  // Overall result
  const allSuitesSuccessful = Object.values(testResults.suites)
    .every(suite => suite.success);
  
  if (allSuitesSuccessful && testResults.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! EmaPay API is ready for production.', 'green');
    return true;
  } else {
    log('\n❌ SOME TESTS FAILED! Please review and fix issues before deployment.', 'red');
    return false;
  }
}

function main() {
  const startTime = Date.now();
  
  logHeader('EMAPAY API COMPREHENSIVE TEST SUITE');
  log('Running all test suites for production readiness validation', 'cyan');
  
  // Check prerequisites
  checkPrerequisites();
  
  // Run test suites
  let allSuccessful = true;
  
  for (const [suiteKey, config] of Object.entries(testConfig)) {
    const success = runTestSuite(suiteKey, config);
    if (!success) {
      allSuccessful = false;
    }
  }
  
  // Generate final report
  const overallSuccess = generateReport();
  
  const totalTime = Date.now() - startTime;
  log(`\nTotal execution time: ${totalTime}ms`, 'cyan');
  
  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught Exception: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n💥 Unhandled Rejection at: ${promise}`, 'red');
  log(`Reason: ${reason}`, 'red');
  process.exit(1);
});

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, testResults };
