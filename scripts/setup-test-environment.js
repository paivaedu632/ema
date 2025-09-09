#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * Sets up isolated test environments for parallel testing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class TestEnvironmentSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.testEnvFile = path.join(this.projectRoot, '.env.test');
    this.exampleEnvFile = path.join(this.projectRoot, '.env.example');
  }

  async setupEnvironment() {
    log('🚀 Setting up test environment...', 'bright');

    try {
      await this.createTestEnvFile();
      await this.validateEnvironmentVariables();
      await this.setupTestDatabase();
      await this.verifyTestSetup();
      
      log('✅ Test environment setup completed successfully!', 'green');
      return true;
    } catch (error) {
      log(`❌ Test environment setup failed: ${error.message}`, 'red');
      return false;
    }
  }

  async createTestEnvFile() {
    log('📝 Creating test environment file...', 'blue');

    // Check if .env.example exists
    if (!fs.existsSync(this.exampleEnvFile)) {
      throw new Error('.env.example file not found');
    }

    // Read example environment file
    const exampleContent = fs.readFileSync(this.exampleEnvFile, 'utf8');
    
    // Create test-specific environment variables
    let testContent = exampleContent;
    
    // Override with test-specific values
    testContent += '\n# Test Environment Overrides\n';
    testContent += 'NODE_ENV=test\n';
    testContent += 'LOG_LEVEL=error\n';
    testContent += 'TEST_TIMEOUT=30000\n';
    
    // Add CI-specific variables if running in CI
    if (process.env.CI) {
      testContent += '\n# CI Environment Variables\n';
      testContent += `SUPABASE_URL=${process.env.SUPABASE_URL || ''}\n`;
      testContent += `SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || ''}\n`;
      testContent += `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}\n`;
    }

    // Write test environment file
    fs.writeFileSync(this.testEnvFile, testContent);
    
    log(`✓ Test environment file created: ${this.testEnvFile}`, 'green');
  }

  async validateEnvironmentVariables() {
    log('🔍 Validating environment variables...', 'blue');

    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    log('✓ All required environment variables are present', 'green');
  }

  async setupTestDatabase() {
    log('🗄️ Setting up test database...', 'blue');

    try {
      // Import test utilities
      const { testUtils } = await import('../tests/utils/index.js');
      
      // Initialize test database
      await testUtils.initializeTestDatabase();
      
      log('✓ Test database initialized successfully', 'green');
    } catch (error) {
      log(`⚠️ Test database setup warning: ${error.message}`, 'yellow');
      // Don't fail the setup for database issues in CI
      if (!process.env.CI) {
        throw error;
      }
    }
  }

  async verifyTestSetup() {
    log('✅ Verifying test setup...', 'blue');

    try {
      // Import and run basic verification
      const { testUtils } = await import('../tests/utils/index.js');
      
      // Create a test user to verify everything works
      const testUser = await testUtils.createUser({
        email: 'setup-verification@emapay.test',
        metadata: { purpose: 'Setup Verification' }
      });

      // Clean up the test user
      await testUtils.cleanup();
      
      log('✓ Test setup verification completed', 'green');
    } catch (error) {
      log(`⚠️ Test setup verification warning: ${error.message}`, 'yellow');
      // Don't fail for verification issues in CI
      if (!process.env.CI) {
        throw error;
      }
    }
  }

  async cleanupTestEnvironment() {
    log('🧹 Cleaning up test environment...', 'blue');

    try {
      // Import test utilities
      const { testUtils } = await import('../tests/utils/index.js');
      
      // Clean up all test data
      await testUtils.cleanup();
      
      log('✓ Test environment cleaned up successfully', 'green');
    } catch (error) {
      log(`⚠️ Test cleanup warning: ${error.message}`, 'yellow');
    }
  }

  async resetTestEnvironment() {
    log('🔄 Resetting test environment...', 'blue');

    await this.cleanupTestEnvironment();
    await this.setupEnvironment();
    
    log('✓ Test environment reset completed', 'green');
  }

  async generateTestReport() {
    log('📊 Generating test environment report...', 'blue');

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
        testEnvExists: fs.existsSync(this.testEnvFile)
      },
      configuration: {
        timeout: process.env.TEST_TIMEOUT || '30000',
        logLevel: process.env.LOG_LEVEL || 'info',
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      supabase: {
        urlConfigured: !!process.env.SUPABASE_URL,
        anonKeyConfigured: !!process.env.SUPABASE_ANON_KEY,
        serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };

    const reportPath = path.join(this.projectRoot, 'test-environment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log(`✓ Test environment report generated: ${reportPath}`, 'green');
    return report;
  }
}

async function main() {
  const command = process.argv[2] || 'setup';
  const setup = new TestEnvironmentSetup();

  try {
    switch (command) {
      case 'setup':
        await setup.setupEnvironment();
        break;
      
      case 'cleanup':
        await setup.cleanupTestEnvironment();
        break;
      
      case 'reset':
        await setup.resetTestEnvironment();
        break;
      
      case 'report':
        await setup.generateTestReport();
        break;
      
      case 'verify':
        await setup.verifyTestSetup();
        break;
      
      default:
        log(`❌ Unknown command: ${command}`, 'red');
        log('Available commands: setup, cleanup, reset, report, verify', 'cyan');
        process.exit(1);
    }
  } catch (error) {
    log(`💥 Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n💥 Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestEnvironmentSetup };
