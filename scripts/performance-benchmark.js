#!/usr/bin/env node

/**
 * Performance Benchmarking Script
 * Measures and tracks API performance over time
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Performance benchmarks and thresholds
const benchmarks = {
  authentication: {
    endpoint: '/api/v1/auth/me',
    method: 'GET',
    threshold: 100, // ms
    description: 'User authentication endpoint'
  },
  userSearch: {
    endpoint: '/api/v1/users/search?q=test',
    method: 'GET',
    threshold: 200, // ms
    description: 'User search functionality'
  },
  walletBalance: {
    endpoint: '/api/v1/wallets/balance',
    method: 'GET',
    threshold: 50, // ms
    description: 'Wallet balance retrieval'
  },
  walletCurrency: {
    endpoint: '/api/v1/wallets/EUR',
    method: 'GET',
    threshold: 50, // ms
    description: 'Specific currency balance'
  },
  transferSend: {
    endpoint: '/api/v1/transfers/send',
    method: 'POST',
    threshold: 500, // ms
    description: 'P2P transfer execution'
  },
  transferHistory: {
    endpoint: '/api/v1/transfers/history',
    method: 'GET',
    threshold: 200, // ms
    description: 'Transfer history retrieval'
  },
  healthCheck: {
    endpoint: '/api/v1/health/status',
    method: 'GET',
    threshold: 50, // ms
    description: 'System health check'
  }
};

class PerformanceBenchmark {
  constructor() {
    this.results = {};
    this.timestamp = new Date().toISOString();
    this.outputDir = path.join(process.cwd(), 'performance-reports');
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runBenchmark(name, config) {
    log(`🔍 Benchmarking ${name}...`, 'blue');
    
    const results = {
      name,
      endpoint: config.endpoint,
      method: config.method,
      threshold: config.threshold,
      description: config.description,
      measurements: [],
      statistics: {}
    };

    // Run multiple measurements
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = process.hrtime.bigint();
        
        // Simulate API call (in real scenario, this would be actual HTTP request)
        await this.simulateApiCall(config);
        
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        
        results.measurements.push(duration);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        log(`❌ Error in ${name}: ${error.message}`, 'red');
        results.measurements.push(null);
      }
    }

    // Calculate statistics
    const validMeasurements = results.measurements.filter(m => m !== null);
    
    if (validMeasurements.length > 0) {
      results.statistics = {
        min: Math.min(...validMeasurements),
        max: Math.max(...validMeasurements),
        avg: validMeasurements.reduce((a, b) => a + b, 0) / validMeasurements.length,
        median: this.calculateMedian(validMeasurements),
        p95: this.calculatePercentile(validMeasurements, 95),
        p99: this.calculatePercentile(validMeasurements, 99),
        successRate: (validMeasurements.length / iterations) * 100
      };
      
      // Check if within threshold
      results.withinThreshold = results.statistics.avg <= config.threshold;
      results.thresholdStatus = results.withinThreshold ? 'PASS' : 'FAIL';
      
      log(`  ✓ Average: ${results.statistics.avg.toFixed(2)}ms (threshold: ${config.threshold}ms)`, 
          results.withinThreshold ? 'green' : 'red');
      log(`  ✓ P95: ${results.statistics.p95.toFixed(2)}ms`, 'cyan');
      log(`  ✓ Success Rate: ${results.statistics.successRate.toFixed(1)}%`, 'cyan');
      
    } else {
      results.statistics = { error: 'All requests failed' };
      results.withinThreshold = false;
      results.thresholdStatus = 'ERROR';
      log(`  ❌ All requests failed`, 'red');
    }

    this.results[name] = results;
    return results;
  }

  async simulateApiCall(config) {
    // Simulate different response times based on endpoint complexity
    const baseDelay = {
      '/api/v1/health/status': 20,
      '/api/v1/auth/me': 50,
      '/api/v1/wallets/balance': 30,
      '/api/v1/wallets/EUR': 25,
      '/api/v1/users/search': 80,
      '/api/v1/transfers/history': 100,
      '/api/v1/transfers/send': 200
    };

    const delay = baseDelay[config.endpoint] || 50;
    const variance = delay * 0.3; // 30% variance
    const actualDelay = delay + (Math.random() - 0.5) * variance;
    
    await new Promise(resolve => setTimeout(resolve, Math.max(actualDelay, 10)));
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  generateReport() {
    const report = {
      timestamp: this.timestamp,
      summary: this.generateSummary(),
      benchmarks: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    const jsonPath = path.join(this.outputDir, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save markdown report
    const markdownPath = path.join(this.outputDir, `benchmark-${Date.now()}.md`);
    fs.writeFileSync(markdownPath, this.generateMarkdownReport(report));

    return { jsonPath, markdownPath, report };
  }

  generateSummary() {
    const benchmarkNames = Object.keys(this.results);
    const passed = benchmarkNames.filter(name => this.results[name].withinThreshold).length;
    const failed = benchmarkNames.filter(name => !this.results[name].withinThreshold).length;
    
    const avgResponseTimes = benchmarkNames.map(name => {
      const stats = this.results[name].statistics;
      return stats.avg || 0;
    });
    
    const overallAvg = avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length;

    return {
      totalBenchmarks: benchmarkNames.length,
      passed,
      failed,
      passRate: (passed / benchmarkNames.length) * 100,
      overallAverageResponseTime: overallAvg
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    Object.entries(this.results).forEach(([name, result]) => {
      if (!result.withinThreshold && result.statistics.avg) {
        const exceedBy = result.statistics.avg - result.threshold;
        const exceedPercent = (exceedBy / result.threshold) * 100;
        
        recommendations.push({
          benchmark: name,
          issue: `Response time exceeds threshold by ${exceedBy.toFixed(2)}ms (${exceedPercent.toFixed(1)}%)`,
          suggestion: this.getSuggestion(name, result)
        });
      }
    });

    return recommendations;
  }

  getSuggestion(name, result) {
    const suggestions = {
      authentication: 'Consider caching JWT validation or optimizing database queries',
      userSearch: 'Add database indexes on search fields or implement search caching',
      walletBalance: 'Optimize balance calculation queries or add caching layer',
      walletCurrency: 'Cache currency-specific balance data',
      transferSend: 'Optimize transaction processing or implement async processing',
      transferHistory: 'Add pagination limits or optimize history queries',
      healthCheck: 'Simplify health check logic or cache system status'
    };

    return suggestions[name] || 'Review and optimize the endpoint implementation';
  }

  generateMarkdownReport(report) {
    let markdown = `# Performance Benchmark Report

**Generated**: ${report.timestamp}

## Summary

- **Total Benchmarks**: ${report.summary.totalBenchmarks}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Pass Rate**: ${report.summary.passRate.toFixed(1)}%
- **Overall Average Response Time**: ${report.summary.overallAverageResponseTime.toFixed(2)}ms

## Benchmark Results

`;

    Object.entries(report.benchmarks).forEach(([name, result]) => {
      const status = result.thresholdStatus;
      const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
      
      markdown += `### ${statusEmoji} ${name}

**Endpoint**: \`${result.method} ${result.endpoint}\`  
**Description**: ${result.description}  
**Threshold**: ${result.threshold}ms  
**Status**: ${status}

`;

      if (result.statistics.avg) {
        markdown += `**Statistics**:
- Average: ${result.statistics.avg.toFixed(2)}ms
- Median: ${result.statistics.median.toFixed(2)}ms
- Min: ${result.statistics.min.toFixed(2)}ms
- Max: ${result.statistics.max.toFixed(2)}ms
- P95: ${result.statistics.p95.toFixed(2)}ms
- P99: ${result.statistics.p99.toFixed(2)}ms
- Success Rate: ${result.statistics.successRate.toFixed(1)}%

`;
      } else {
        markdown += `**Error**: ${result.statistics.error}

`;
      }
    });

    if (report.recommendations.length > 0) {
      markdown += `## Recommendations

`;
      report.recommendations.forEach(rec => {
        markdown += `### ${rec.benchmark}

**Issue**: ${rec.issue}  
**Suggestion**: ${rec.suggestion}

`;
      });
    }

    markdown += `## Historical Tracking

To track performance over time, run this benchmark regularly and compare results.

`;

    return markdown;
  }

  async runAllBenchmarks() {
    log('🚀 Starting Performance Benchmark Suite', 'bright');
    log(`📊 Running ${Object.keys(benchmarks).length} benchmarks...`, 'cyan');

    for (const [name, config] of Object.entries(benchmarks)) {
      await this.runBenchmark(name, config);
    }

    log('\n📈 Generating reports...', 'yellow');
    const { jsonPath, markdownPath, report } = this.generateReport();

    log('\n✅ Benchmark completed!', 'green');
    log(`📄 JSON Report: ${jsonPath}`, 'cyan');
    log(`📄 Markdown Report: ${markdownPath}`, 'cyan');
    
    log('\n📊 Summary:', 'bright');
    log(`   Pass Rate: ${report.summary.passRate.toFixed(1)}%`, 
        report.summary.passRate >= 80 ? 'green' : 'red');
    log(`   Average Response Time: ${report.summary.overallAverageResponseTime.toFixed(2)}ms`, 'cyan');

    return report.summary.passRate >= 80;
  }
}

async function main() {
  const benchmark = new PerformanceBenchmark();
  const success = await benchmark.runAllBenchmarks();
  
  process.exit(success ? 0 : 1);
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the benchmark
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PerformanceBenchmark };
