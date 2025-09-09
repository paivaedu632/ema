#!/usr/bin/env node

/**
 * Security Scanning Script
 * Automated security vulnerability scanning for CI pipeline
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

class SecurityScanner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.outputDir = path.join(this.projectRoot, 'security-reports');
    this.results = {
      timestamp: new Date().toISOString(),
      scans: {},
      summary: {
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0
      }
    };

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runAllScans() {
    log('🔒 Starting comprehensive security scan...', 'bright');

    try {
      await this.runNpmAudit();
      await this.runDependencyCheck();
      await this.runSecurityTests();
      await this.runStaticAnalysis();
      await this.generateSecurityReport();

      log('✅ Security scan completed successfully!', 'green');
      return this.results.summary.criticalVulnerabilities === 0 && 
             this.results.summary.highVulnerabilities === 0;
    } catch (error) {
      log(`❌ Security scan failed: ${error.message}`, 'red');
      return false;
    }
  }

  async runNpmAudit() {
    log('🔍 Running npm audit...', 'blue');

    try {
      const auditOutput = execSync('npm audit --json', { 
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      const auditResult = JSON.parse(auditOutput);
      
      this.results.scans.npmAudit = {
        status: 'completed',
        vulnerabilities: auditResult.vulnerabilities || {},
        metadata: auditResult.metadata || {}
      };

      // Count vulnerabilities by severity
      if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
        const vulns = auditResult.metadata.vulnerabilities;
        this.results.summary.criticalVulnerabilities += vulns.critical || 0;
        this.results.summary.highVulnerabilities += vulns.high || 0;
        this.results.summary.mediumVulnerabilities += vulns.moderate || 0;
        this.results.summary.lowVulnerabilities += vulns.low || 0;
        this.results.summary.totalVulnerabilities += vulns.total || 0;
      }

      log(`✓ npm audit completed: ${this.results.summary.totalVulnerabilities} vulnerabilities found`, 'green');
    } catch (error) {
      log(`⚠️ npm audit warning: ${error.message}`, 'yellow');
      this.results.scans.npmAudit = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runDependencyCheck() {
    log('📦 Checking dependency security...', 'blue');

    try {
      // Read package.json to analyze dependencies
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const suspiciousDependencies = [];
      const outdatedDependencies = [];

      // Check for suspicious or known problematic packages
      const suspiciousPatterns = [
        /^[a-z]{1,2}$/,  // Very short names (potential typosquatting)
        /\d{10,}/,       // Long numbers (potential malicious)
        /[A-Z]{5,}/      // All caps (unusual naming)
      ];

      Object.keys(dependencies).forEach(dep => {
        if (suspiciousPatterns.some(pattern => pattern.test(dep))) {
          suspiciousDependencies.push(dep);
        }
      });

      this.results.scans.dependencyCheck = {
        status: 'completed',
        totalDependencies: Object.keys(dependencies).length,
        suspiciousDependencies,
        outdatedDependencies
      };

      log(`✓ Dependency check completed: ${suspiciousDependencies.length} suspicious dependencies`, 'green');
    } catch (error) {
      log(`⚠️ Dependency check warning: ${error.message}`, 'yellow');
      this.results.scans.dependencyCheck = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runSecurityTests() {
    log('🛡️ Running security tests...', 'blue');

    try {
      // Run security-specific tests
      const securityTestOutput = execSync('npm test -- tests/unit/security.test.ts --json', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      const testResults = JSON.parse(securityTestOutput);
      
      this.results.scans.securityTests = {
        status: 'completed',
        testResults: {
          numTotalTests: testResults.numTotalTests || 0,
          numPassedTests: testResults.numPassedTests || 0,
          numFailedTests: testResults.numFailedTests || 0,
          success: testResults.success || false
        }
      };

      if (testResults.numFailedTests > 0) {
        this.results.summary.highVulnerabilities += testResults.numFailedTests;
        this.results.summary.totalVulnerabilities += testResults.numFailedTests;
      }

      log(`✓ Security tests completed: ${testResults.numPassedTests}/${testResults.numTotalTests} passed`, 'green');
    } catch (error) {
      log(`⚠️ Security tests warning: ${error.message}`, 'yellow');
      this.results.scans.securityTests = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runStaticAnalysis() {
    log('🔬 Running static code analysis...', 'blue');

    try {
      // Check for common security anti-patterns in code
      const securityIssues = [];
      
      // Scan source files for security issues
      const srcDir = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcDir)) {
        await this.scanDirectoryForSecurityIssues(srcDir, securityIssues);
      }

      // Scan API files
      const apiDir = path.join(this.projectRoot, 'pages/api');
      if (fs.existsSync(apiDir)) {
        await this.scanDirectoryForSecurityIssues(apiDir, securityIssues);
      }

      this.results.scans.staticAnalysis = {
        status: 'completed',
        securityIssues,
        issueCount: securityIssues.length
      };

      if (securityIssues.length > 0) {
        this.results.summary.mediumVulnerabilities += securityIssues.length;
        this.results.summary.totalVulnerabilities += securityIssues.length;
      }

      log(`✓ Static analysis completed: ${securityIssues.length} potential issues found`, 'green');
    } catch (error) {
      log(`⚠️ Static analysis warning: ${error.message}`, 'yellow');
      this.results.scans.staticAnalysis = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async scanDirectoryForSecurityIssues(directory, issues) {
    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(directory, file.name);

      if (file.isDirectory()) {
        await this.scanDirectoryForSecurityIssues(filePath, issues);
      } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
        await this.scanFileForSecurityIssues(filePath, issues);
      }
    }
  }

  async scanFileForSecurityIssues(filePath, issues) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Security patterns to check for
      const securityPatterns = [
        {
          pattern: /console\.log\(/g,
          severity: 'low',
          description: 'Console.log statements may leak sensitive information'
        },
        {
          pattern: /eval\(/g,
          severity: 'high',
          description: 'Use of eval() can lead to code injection vulnerabilities'
        },
        {
          pattern: /innerHTML\s*=/g,
          severity: 'medium',
          description: 'Direct innerHTML assignment may lead to XSS vulnerabilities'
        },
        {
          pattern: /document\.write\(/g,
          severity: 'medium',
          description: 'document.write() can lead to XSS vulnerabilities'
        },
        {
          pattern: /process\.env\.[A-Z_]+/g,
          severity: 'low',
          description: 'Environment variable usage - ensure no secrets are logged'
        },
        {
          pattern: /password|secret|key|token/gi,
          severity: 'medium',
          description: 'Potential hardcoded credentials or sensitive data'
        }
      ];

      lines.forEach((line, lineNumber) => {
        securityPatterns.forEach(({ pattern, severity, description }) => {
          const matches = line.match(pattern);
          if (matches) {
            issues.push({
              file: path.relative(this.projectRoot, filePath),
              line: lineNumber + 1,
              severity,
              description,
              code: line.trim()
            });
          }
        });
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }

  async generateSecurityReport() {
    log('📊 Generating security report...', 'blue');

    // Generate JSON report
    const jsonReportPath = path.join(this.outputDir, `security-report-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.results, null, 2));

    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport();
    const markdownReportPath = path.join(this.outputDir, `security-report-${Date.now()}.md`);
    fs.writeFileSync(markdownReportPath, markdownReport);

    log(`✓ Security reports generated:`, 'green');
    log(`  JSON: ${jsonReportPath}`, 'cyan');
    log(`  Markdown: ${markdownReportPath}`, 'cyan');

    return { jsonReportPath, markdownReportPath };
  }

  generateMarkdownReport() {
    const { summary, scans } = this.results;

    let markdown = `# Security Scan Report

**Generated**: ${this.results.timestamp}

## Summary

- **Total Vulnerabilities**: ${summary.totalVulnerabilities}
- **Critical**: ${summary.criticalVulnerabilities}
- **High**: ${summary.highVulnerabilities}
- **Medium**: ${summary.mediumVulnerabilities}
- **Low**: ${summary.lowVulnerabilities}

## Scan Results

`;

    // npm Audit Results
    if (scans.npmAudit) {
      markdown += `### npm Audit

**Status**: ${scans.npmAudit.status}

`;
      if (scans.npmAudit.status === 'completed' && scans.npmAudit.metadata) {
        const vulns = scans.npmAudit.metadata.vulnerabilities || {};
        markdown += `- Critical: ${vulns.critical || 0}
- High: ${vulns.high || 0}
- Moderate: ${vulns.moderate || 0}
- Low: ${vulns.low || 0}

`;
      }
    }

    // Dependency Check Results
    if (scans.dependencyCheck) {
      markdown += `### Dependency Check

**Status**: ${scans.dependencyCheck.status}

`;
      if (scans.dependencyCheck.status === 'completed') {
        markdown += `- Total Dependencies: ${scans.dependencyCheck.totalDependencies}
- Suspicious Dependencies: ${scans.dependencyCheck.suspiciousDependencies.length}

`;
        if (scans.dependencyCheck.suspiciousDependencies.length > 0) {
          markdown += `**Suspicious Dependencies**:
${scans.dependencyCheck.suspiciousDependencies.map(dep => `- ${dep}`).join('\n')}

`;
        }
      }
    }

    // Security Tests Results
    if (scans.securityTests) {
      markdown += `### Security Tests

**Status**: ${scans.securityTests.status}

`;
      if (scans.securityTests.status === 'completed') {
        const tests = scans.securityTests.testResults;
        markdown += `- Total Tests: ${tests.numTotalTests}
- Passed: ${tests.numPassedTests}
- Failed: ${tests.numFailedTests}
- Success: ${tests.success}

`;
      }
    }

    // Static Analysis Results
    if (scans.staticAnalysis) {
      markdown += `### Static Analysis

**Status**: ${scans.staticAnalysis.status}

`;
      if (scans.staticAnalysis.status === 'completed') {
        markdown += `- Issues Found: ${scans.staticAnalysis.issueCount}

`;
        if (scans.staticAnalysis.securityIssues.length > 0) {
          markdown += `**Security Issues**:

`;
          scans.staticAnalysis.securityIssues.forEach(issue => {
            markdown += `- **${issue.severity.toUpperCase()}**: ${issue.description}
  - File: \`${issue.file}:${issue.line}\`
  - Code: \`${issue.code}\`

`;
          });
        }
      }
    }

    markdown += `## Recommendations

`;

    if (summary.criticalVulnerabilities > 0) {
      markdown += `🚨 **CRITICAL**: ${summary.criticalVulnerabilities} critical vulnerabilities found. Address immediately.

`;
    }

    if (summary.highVulnerabilities > 0) {
      markdown += `⚠️ **HIGH**: ${summary.highVulnerabilities} high-severity vulnerabilities found. Address as soon as possible.

`;
    }

    if (summary.totalVulnerabilities === 0) {
      markdown += `✅ **GOOD**: No vulnerabilities found. Continue monitoring.

`;
    }

    return markdown;
  }
}

async function main() {
  const scanner = new SecurityScanner();
  const success = await scanner.runAllScans();
  
  process.exit(success ? 0 : 1);
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the scanner
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SecurityScanner };
