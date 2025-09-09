#!/usr/bin/env node

/**
 * Test Documentation Generator
 * Generates comprehensive test documentation from test files
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  const testSuites = [];
  let currentSuite = null;
  let currentDescribe = null;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match describe blocks
    const describeMatch = line.match(/describe\(['"`]([^'"`]+)['"`]/);
    if (describeMatch) {
      if (!currentSuite) {
        currentSuite = {
          name: describeMatch[1],
          file: fileName,
          describes: []
        };
        testSuites.push(currentSuite);
      } else {
        currentDescribe = {
          name: describeMatch[1],
          tests: []
        };
        currentSuite.describes.push(currentDescribe);
      }
    }
    
    // Match test blocks
    const testMatch = line.match(/test\(['"`]([^'"`]+)['"`]/);
    if (testMatch && currentDescribe) {
      currentDescribe.tests.push({
        name: testMatch[1],
        line: i + 1
      });
    }
  }
  
  return testSuites;
}

function generateMarkdownDocs(testData) {
  let markdown = `# EmaPay API Test Documentation

Generated on: ${new Date().toISOString()}

## Overview

This document provides comprehensive documentation of all test cases in the EmaPay API testing suite.

## Test Coverage Summary

`;

  let totalTests = 0;
  let totalSuites = 0;
  let totalDescribes = 0;

  // Calculate totals
  testData.forEach(suite => {
    totalSuites++;
    suite.describes.forEach(describe => {
      totalDescribes++;
      totalTests += describe.tests.length;
    });
  });

  markdown += `- **Total Test Suites**: ${totalSuites}
- **Total Test Groups**: ${totalDescribes}
- **Total Test Cases**: ${totalTests}

## Test Suites

`;

  // Generate documentation for each test suite
  testData.forEach(suite => {
    markdown += `### ${suite.name}

**File**: \`${suite.file}\`

`;

    suite.describes.forEach(describe => {
      markdown += `#### ${describe.name}

`;

      describe.tests.forEach(test => {
        markdown += `- **${test.name}** (Line ${test.line})
`;
      });

      markdown += `
`;
    });

    markdown += `---

`;
  });

  return markdown;
}

function generateTestMatrix(testData) {
  const matrix = {
    authentication: [],
    users: [],
    wallets: [],
    transfers: [],
    security: [],
    health: [],
    integration: [],
    edgeCases: []
  };

  testData.forEach(suite => {
    const suiteName = suite.name.toLowerCase();
    let category = 'other';
    
    if (suiteName.includes('auth')) category = 'authentication';
    else if (suiteName.includes('user')) category = 'users';
    else if (suiteName.includes('wallet')) category = 'wallets';
    else if (suiteName.includes('transfer')) category = 'transfers';
    else if (suiteName.includes('security')) category = 'security';
    else if (suiteName.includes('health')) category = 'health';
    else if (suiteName.includes('integration')) category = 'integration';
    else if (suiteName.includes('edge')) category = 'edgeCases';

    if (matrix[category]) {
      matrix[category].push(suite);
    }
  });

  return matrix;
}

function generateCoverageReport(testMatrix) {
  let report = `# Test Coverage Report

## Coverage by Category

`;

  Object.entries(testMatrix).forEach(([category, suites]) => {
    const testCount = suites.reduce((total, suite) => {
      return total + suite.describes.reduce((descTotal, desc) => {
        return descTotal + desc.tests.length;
      }, 0);
    }, 0);

    report += `### ${category.charAt(0).toUpperCase() + category.slice(1)}

- **Test Suites**: ${suites.length}
- **Test Cases**: ${testCount}

`;

    suites.forEach(suite => {
      report += `#### ${suite.name}
`;
      suite.describes.forEach(describe => {
        report += `- ${describe.name} (${describe.tests.length} tests)
`;
      });
      report += `
`;
    });
  });

  return report;
}

function generateTestSpecification(testData) {
  let spec = `# EmaPay API Test Specification

## Test Requirements

This document outlines the testing requirements and specifications for the EmaPay API.

### Functional Requirements

`;

  const requirements = {
    'Authentication': [
      'JWT token validation',
      'Authorization header processing',
      'Token security and tampering prevention',
      'Session management'
    ],
    'User Management': [
      'User search functionality',
      'Privacy protection',
      'Data sanitization',
      'Authorization enforcement'
    ],
    'Wallet Operations': [
      'Balance retrieval',
      'Multi-currency support',
      'Decimal precision handling',
      'Authorization validation'
    ],
    'Transfer Operations': [
      'P2P transfer execution',
      'Balance validation',
      'Transaction history',
      'Business rule enforcement'
    ],
    'Security': [
      'SQL injection prevention',
      'XSS protection',
      'Input sanitization',
      'Authentication bypass prevention'
    ],
    'Performance': [
      'Response time requirements',
      'Concurrent request handling',
      'Load testing',
      'Resource usage monitoring'
    ]
  };

  Object.entries(requirements).forEach(([category, reqs]) => {
    spec += `#### ${category}

`;
    reqs.forEach(req => {
      spec += `- ${req}
`;
    });
    spec += `
`;
  });

  spec += `### Non-Functional Requirements

- **Performance**: All endpoints must respond within specified time limits
- **Security**: All inputs must be validated and sanitized
- **Reliability**: System must handle errors gracefully
- **Scalability**: System must handle concurrent users
- **Maintainability**: Tests must be readable and maintainable

### Test Data Requirements

- Test users with various balance states
- Valid and invalid input scenarios
- Edge cases and boundary conditions
- Security attack vectors
- Performance stress scenarios

`;

  return spec;
}

function main() {
  log('🔍 Generating EmaPay API Test Documentation...', 'cyan');
  
  const testDir = path.join(process.cwd(), 'tests');
  const outputDir = path.join(process.cwd(), 'docs', 'testing');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Find all test files
  const testFiles = [];
  
  function findTestFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findTestFiles(filePath);
      } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
        testFiles.push(filePath);
      }
    });
  }
  
  findTestFiles(testDir);
  
  log(`📁 Found ${testFiles.length} test files`, 'green');
  
  // Parse all test files
  const allTestData = [];
  testFiles.forEach(file => {
    log(`📖 Parsing ${path.basename(file)}...`, 'blue');
    const testData = parseTestFile(file);
    allTestData.push(...testData);
  });
  
  // Generate documentation
  log('📝 Generating documentation...', 'yellow');
  
  const markdown = generateMarkdownDocs(allTestData);
  fs.writeFileSync(path.join(outputDir, 'test-documentation.md'), markdown);
  
  const testMatrix = generateTestMatrix(allTestData);
  const coverageReport = generateCoverageReport(testMatrix);
  fs.writeFileSync(path.join(outputDir, 'coverage-report.md'), coverageReport);
  
  const specification = generateTestSpecification(allTestData);
  fs.writeFileSync(path.join(outputDir, 'test-specification.md'), specification);
  
  // Generate summary
  const totalTests = allTestData.reduce((total, suite) => {
    return total + suite.describes.reduce((descTotal, desc) => {
      return descTotal + desc.tests.length;
    }, 0);
  }, 0);
  
  log('\n✅ Documentation generated successfully!', 'green');
  log(`📊 Summary:`, 'bright');
  log(`   - Test Suites: ${allTestData.length}`, 'cyan');
  log(`   - Test Cases: ${totalTests}`, 'cyan');
  log(`   - Output Directory: ${outputDir}`, 'cyan');
  
  log('\n📄 Generated Files:', 'bright');
  log(`   - test-documentation.md`, 'green');
  log(`   - coverage-report.md`, 'green');
  log(`   - test-specification.md`, 'green');
  
  return true;
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
