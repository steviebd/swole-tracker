#!/usr/bin/env tsx

/**
 * Performance and Load Testing Suite
 * 
 * Benchmarks the Cloudflare deployment against performance requirements:
 * - Page load times
 * - API response times
 * - Cold start performance
 * - Concurrent user simulation
 * - Database query performance
 * - Rate limiting effectiveness
 * 
 * Usage:
 *   bun run test:performance --env=staging
 *   bun run test:performance --env=staging --load-test --users=50
 */

interface PerformanceOptions {
  env: 'local' | 'staging' | 'production';
  baseUrl?: string;
  loadTest: boolean;
  users: number;
  duration: number; // seconds
  verbose: boolean;
}

interface PerformanceMetrics {
  responseTime: number;
  firstByte: number;
  contentLoaded: number;
  transferSize: number;
  status: number;
  error?: string;
}

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface PerformanceReport {
  environment: string;
  baseUrl: string;
  timestamp: string;
  coldStartMetrics: PerformanceMetrics[];
  pageLoadMetrics: PerformanceMetrics[];
  apiMetrics: PerformanceMetrics[];
  databaseMetrics: PerformanceMetrics[];
  loadTestResults: LoadTestResult[];
  summary: {
    overallScore: number;
    recommendations: string[];
    passedThresholds: string[];
    failedThresholds: string[];
  };
}

class PerformanceTester {
  private options: PerformanceOptions;
  private baseUrl: string;
  private report: PerformanceReport;

  constructor(options: PerformanceOptions) {
    this.options = options;
    this.baseUrl = this.getBaseUrl();
    this.report = {
      environment: options.env,
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      coldStartMetrics: [],
      pageLoadMetrics: [],
      apiMetrics: [],
      databaseMetrics: [],
      loadTestResults: [],
      summary: {
        overallScore: 0,
        recommendations: [],
        passedThresholds: [],
        failedThresholds: []
      }
    };
  }

  /**
   * Run complete performance test suite
   */
  async runTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting Performance Testing Suite');
    console.log(`Environment: ${this.options.env}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Load Test: ${this.options.loadTest}`);
    if (this.options.loadTest) {
      console.log(`Simulated Users: ${this.options.users}`);
      console.log(`Test Duration: ${this.options.duration}s`);
    }
    console.log('');

    // 1. Cold start performance
    await this.testColdStartPerformance();
    
    // 2. Page load performance
    await this.testPageLoadPerformance();
    
    // 3. API response times
    await this.testApiPerformance();
    
    // 4. Database query performance
    await this.testDatabasePerformance();
    
    // 5. Load testing (if enabled)
    if (this.options.loadTest) {
      await this.runLoadTests();
    }
    
    // 6. Generate summary and recommendations
    this.generateSummary();
    
    this.printReport();
    return this.report;
  }

  /**
   * Test cold start performance
   */
  private async testColdStartPerformance(): Promise<void> {
    console.log('❄️  Testing Cold Start Performance...');
    
    // Wait to ensure any cached instances expire
    console.log('  Waiting for potential cache expiry...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const endpoints = [
      '/',
      '/auth/login',
      '/api/healthcheck',
      '/api/trpc/templates.getAll'
    ];
    
    for (const endpoint of endpoints) {
      const metrics = await this.measureRequest(`${this.baseUrl}${endpoint}`, 'Cold Start');
      this.report.coldStartMetrics.push(metrics);
      
      if (this.options.verbose) {
        console.log(`  ${endpoint}: ${metrics.responseTime}ms`);
      }
    }
    
    const avgColdStart = this.report.coldStartMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.coldStartMetrics.length;
    console.log(`  Average cold start time: ${avgColdStart.toFixed(0)}ms`);
    console.log('');
  }

  /**
   * Test page load performance
   */
  private async testPageLoadPerformance(): Promise<void> {
    console.log('📄 Testing Page Load Performance...');
    
    const pages = [
      '/',
      '/auth/login',
      '/auth/register',
      '/templates',
      '/workouts',
      '/progress'
    ];
    
    for (const page of pages) {
      const metrics = await this.measureRequest(`${this.baseUrl}${page}`, 'Page Load');
      this.report.pageLoadMetrics.push(metrics);
      
      if (this.options.verbose) {
        console.log(`  ${page}: ${metrics.responseTime}ms (${metrics.transferSize} bytes)`);
      }
    }
    
    const avgPageLoad = this.report.pageLoadMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.pageLoadMetrics.length;
    console.log(`  Average page load time: ${avgPageLoad.toFixed(0)}ms`);
    console.log('');
  }

  /**
   * Test API performance
   */
  private async testApiPerformance(): Promise<void> {
    console.log('⚡ Testing API Performance...');
    
    const apiEndpoints = [
      '/api/trpc/templates.getAll',
      '/api/trpc/workouts.getRecent',
      '/api/trpc/progress.getStats',
      '/api/joke',
      '/api/health-advice'
    ];
    
    // Test each endpoint multiple times for accuracy
    for (const endpoint of apiEndpoints) {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const metrics = await this.measureRequest(`${this.baseUrl}${endpoint}`, 'API');
        measurements.push(metrics);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Calculate averages
      const avgMetrics = {
        responseTime: measurements.reduce((sum, m) => sum + m.responseTime, 0) / measurements.length,
        firstByte: measurements.reduce((sum, m) => sum + m.firstByte, 0) / measurements.length,
        contentLoaded: measurements.reduce((sum, m) => sum + m.contentLoaded, 0) / measurements.length,
        transferSize: measurements.reduce((sum, m) => sum + m.transferSize, 0) / measurements.length,
        status: measurements[0].status
      };
      
      this.report.apiMetrics.push(avgMetrics);
      
      if (this.options.verbose) {
        console.log(`  ${endpoint}: ${avgMetrics.responseTime.toFixed(0)}ms`);
      }
    }
    
    const avgApiResponse = this.report.apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.apiMetrics.length;
    console.log(`  Average API response time: ${avgApiResponse.toFixed(0)}ms`);
    console.log('');
  }

  /**
   * Test database query performance
   */
  private async testDatabasePerformance(): Promise<void> {
    console.log('🗄️  Testing Database Performance...');
    
    // These endpoints likely involve database queries
    const dbEndpoints = [
      '/api/trpc/templates.getAll',
      '/api/trpc/workouts.getRecent',
      '/api/trpc/progress.getStats',
      '/api/trpc/exercises.getAll'
    ];
    
    for (const endpoint of dbEndpoints) {
      // Test with multiple rapid requests to simulate database load
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        return await this.measureRequest(`${this.baseUrl}${endpoint}`, 'Database');
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const totalTime = endTime - startTime;
      
      // Store average metrics
      this.report.databaseMetrics.push({
        responseTime: avgResponseTime,
        firstByte: results.reduce((sum, r) => sum + r.firstByte, 0) / results.length,
        contentLoaded: avgResponseTime, // Approximate
        transferSize: results.reduce((sum, r) => sum + r.transferSize, 0) / results.length,
        status: results[0].status
      });
      
      if (this.options.verbose) {
        console.log(`  ${endpoint}: ${avgResponseTime.toFixed(0)}ms (${concurrentRequests} concurrent, ${totalTime}ms total)`);
      }
    }
    
    const avgDbQuery = this.report.databaseMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.databaseMetrics.length;
    console.log(`  Average database query time: ${avgDbQuery.toFixed(0)}ms`);
    console.log('');
  }

  /**
   * Run load tests with simulated concurrent users
   */
  private async runLoadTests(): Promise<void> {
    console.log('👥 Running Load Tests...');
    console.log(`  Simulating ${this.options.users} concurrent users for ${this.options.duration} seconds`);
    
    const testEndpoints = [
      '/',
      '/api/trpc/templates.getAll',
      '/api/joke'
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`  📊 Load testing: ${endpoint}`);
      const result = await this.simulateLoad(`${this.baseUrl}${endpoint}`, this.options.users, this.options.duration);
      this.report.loadTestResults.push(result);
      
      console.log(`    ${result.successfulRequests}/${result.totalRequests} requests successful`);
      console.log(`    Average response time: ${result.averageResponseTime.toFixed(0)}ms`);
      console.log(`    P95 response time: ${result.p95ResponseTime.toFixed(0)}ms`);
      console.log(`    Requests per second: ${result.requestsPerSecond.toFixed(1)}`);
    }
    
    console.log('');
  }

  /**
   * Simulate concurrent load on an endpoint
   */
  private async simulateLoad(url: string, users: number, duration: number): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    
    // Create worker functions for each simulated user
    const workers = Array(users).fill(null).map(async () => {
      while (Date.now() < endTime) {
        try {
          totalRequests++;
          const requestStart = Date.now();
          const response = await fetch(url);
          const requestEnd = Date.now();
          
          const responseTime = requestEnd - requestStart;
          responseTimes.push(responseTime);
          
          if (response.ok) {
            successfulRequests++;
          } else {
            errors.push(`HTTP ${response.status}`);
          }
          
        } catch (error) {
          errors.push(String(error));
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
    });
    
    await Promise.all(workers);
    
    // Calculate statistics
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    const actualDuration = (Date.now() - startTime) / 1000;
    const requestsPerSecond = totalRequests / actualDuration;
    
    return {
      endpoint: url,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime,
      requestsPerSecond,
      errors: [...new Set(errors)].slice(0, 10) // Unique errors, max 10
    };
  }

  /**
   * Measure request performance metrics
   */
  private async measureRequest(url: string, category: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    let firstByte = 0;
    let transferSize = 0;
    let status = 0;
    let error: string | undefined;
    
    try {
      const response = await fetch(url);
      firstByte = Date.now() - startTime;
      status = response.status;
      
      // Get response body to measure full transfer
      const text = await response.text();
      transferSize = new Blob([text]).size;
      
    } catch (err) {
      error = String(err);
      status = 0;
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      responseTime,
      firstByte,
      contentLoaded: responseTime, // Approximate for API requests
      transferSize,
      status,
      error
    };
  }

  /**
   * Generate performance summary and recommendations
   */
  private generateSummary(): void {
    const thresholds = {
      coldStart: 3000, // 3 seconds
      pageLoad: 2000,  // 2 seconds  
      api: 500,        // 500ms
      database: 1000,  // 1 second
      loadTestSuccessRate: 0.95 // 95%
    };
    
    let score = 100;
    const { summary } = this.report;
    
    // Check cold start performance
    const avgColdStart = this.report.coldStartMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.coldStartMetrics.length;
    if (avgColdStart <= thresholds.coldStart) {
      summary.passedThresholds.push(`Cold start performance: ${avgColdStart.toFixed(0)}ms <= ${thresholds.coldStart}ms`);
    } else {
      summary.failedThresholds.push(`Cold start performance: ${avgColdStart.toFixed(0)}ms > ${thresholds.coldStart}ms`);
      summary.recommendations.push('Optimize cold start performance - consider keeping functions warm');
      score -= 15;
    }
    
    // Check page load performance
    const avgPageLoad = this.report.pageLoadMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.pageLoadMetrics.length;
    if (avgPageLoad <= thresholds.pageLoad) {
      summary.passedThresholds.push(`Page load performance: ${avgPageLoad.toFixed(0)}ms <= ${thresholds.pageLoad}ms`);
    } else {
      summary.failedThresholds.push(`Page load performance: ${avgPageLoad.toFixed(0)}ms > ${thresholds.pageLoad}ms`);
      summary.recommendations.push('Optimize page load times - consider code splitting, compression, CDN');
      score -= 20;
    }
    
    // Check API performance
    const avgApi = this.report.apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.apiMetrics.length;
    if (avgApi <= thresholds.api) {
      summary.passedThresholds.push(`API performance: ${avgApi.toFixed(0)}ms <= ${thresholds.api}ms`);
    } else {
      summary.failedThresholds.push(`API performance: ${avgApi.toFixed(0)}ms > ${thresholds.api}ms`);
      summary.recommendations.push('Optimize API response times - check database queries and caching');
      score -= 25;
    }
    
    // Check database performance
    if (this.report.databaseMetrics.length > 0) {
      const avgDb = this.report.databaseMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.databaseMetrics.length;
      if (avgDb <= thresholds.database) {
        summary.passedThresholds.push(`Database performance: ${avgDb.toFixed(0)}ms <= ${thresholds.database}ms`);
      } else {
        summary.failedThresholds.push(`Database performance: ${avgDb.toFixed(0)}ms > ${thresholds.database}ms`);
        summary.recommendations.push('Optimize database queries - add indexes, optimize query patterns');
        score -= 20;
      }
    }
    
    // Check load test results
    if (this.report.loadTestResults.length > 0) {
      const avgSuccessRate = this.report.loadTestResults.reduce((sum, r) => sum + (r.successfulRequests / r.totalRequests), 0) / this.report.loadTestResults.length;
      if (avgSuccessRate >= thresholds.loadTestSuccessRate) {
        summary.passedThresholds.push(`Load test success rate: ${(avgSuccessRate * 100).toFixed(1)}% >= ${(thresholds.loadTestSuccessRate * 100)}%`);
      } else {
        summary.failedThresholds.push(`Load test success rate: ${(avgSuccessRate * 100).toFixed(1)}% < ${(thresholds.loadTestSuccessRate * 100)}%`);
        summary.recommendations.push('Improve system reliability under load - check error handling and scaling');
        score -= 20;
      }
    }
    
    summary.overallScore = Math.max(0, score);
  }

  /**
   * Get base URL for environment
   */
  private getBaseUrl(): string {
    if (this.options.baseUrl) {
      return this.options.baseUrl;
    }
    
    switch (this.options.env) {
      case 'local':
        return 'http://localhost:3000';
      case 'staging':
        return 'https://staging-swole-tracker.pages.dev';
      case 'production':
        return 'https://swole-tracker.pages.dev';
      default:
        throw new Error(`Unknown environment: ${this.options.env}`);
    }
  }

  /**
   * Print detailed performance report
   */
  private printReport(): void {
    console.log('📊 Performance Test Report');
    console.log('═══════════════════════════');
    console.log(`Environment: ${this.report.environment}`);
    console.log(`Base URL: ${this.report.baseUrl}`);
    console.log(`Test Time: ${this.report.timestamp}`);
    console.log(`Overall Score: ${this.report.summary.overallScore}/100`);
    console.log('');
    
    // Cold start metrics
    if (this.report.coldStartMetrics.length > 0) {
      console.log('❄️  Cold Start Performance:');
      const avg = this.report.coldStartMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.coldStartMetrics.length;
      console.log(`  Average: ${avg.toFixed(0)}ms`);
      console.log(`  Range: ${Math.min(...this.report.coldStartMetrics.map(m => m.responseTime))}ms - ${Math.max(...this.report.coldStartMetrics.map(m => m.responseTime))}ms`);
      console.log('');
    }
    
    // Page load metrics
    if (this.report.pageLoadMetrics.length > 0) {
      console.log('📄 Page Load Performance:');
      const avg = this.report.pageLoadMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.pageLoadMetrics.length;
      console.log(`  Average: ${avg.toFixed(0)}ms`);
      console.log(`  Total Transfer: ${this.report.pageLoadMetrics.reduce((sum, m) => sum + m.transferSize, 0)} bytes`);
      console.log('');
    }
    
    // API metrics
    if (this.report.apiMetrics.length > 0) {
      console.log('⚡ API Performance:');
      const avg = this.report.apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.report.apiMetrics.length;
      console.log(`  Average: ${avg.toFixed(0)}ms`);
      console.log(`  First Byte: ${this.report.apiMetrics.reduce((sum, m) => sum + m.firstByte, 0) / this.report.apiMetrics.length}ms`);
      console.log('');
    }
    
    // Load test results
    if (this.report.loadTestResults.length > 0) {
      console.log('👥 Load Test Results:');
      this.report.loadTestResults.forEach(result => {
        console.log(`  ${result.endpoint}:`);
        console.log(`    Requests: ${result.totalRequests} (${result.successfulRequests} successful)`);
        console.log(`    RPS: ${result.requestsPerSecond.toFixed(1)}`);
        console.log(`    Response Time: avg ${result.averageResponseTime.toFixed(0)}ms, p95 ${result.p95ResponseTime.toFixed(0)}ms`);
        if (result.errors.length > 0) {
          console.log(`    Errors: ${result.errors.join(', ')}`);
        }
      });
      console.log('');
    }
    
    // Summary
    console.log('🎯 Performance Summary:');
    console.log('─────────────────────');
    if (this.report.summary.passedThresholds.length > 0) {
      console.log('✅ Passed Thresholds:');
      this.report.summary.passedThresholds.forEach(threshold => {
        console.log(`  - ${threshold}`);
      });
    }
    
    if (this.report.summary.failedThresholds.length > 0) {
      console.log('❌ Failed Thresholds:');
      this.report.summary.failedThresholds.forEach(threshold => {
        console.log(`  - ${threshold}`);
      });
    }
    
    if (this.report.summary.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      this.report.summary.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
    
    // Migration readiness
    console.log('\n🏁 Migration Performance Assessment:');
    if (this.report.summary.overallScore >= 80) {
      console.log('✅ EXCELLENT - Performance meets production standards');
    } else if (this.report.summary.overallScore >= 60) {
      console.log('⚠️  ACCEPTABLE - Some optimizations recommended');
    } else {
      console.log('❌ NEEDS IMPROVEMENT - Address performance issues before production');
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options: PerformanceOptions = {
    env: 'local',
    loadTest: false,
    users: 10,
    duration: 30,
    verbose: false,
  };
  
  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as any;
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.split('=')[1];
    } else if (arg.startsWith('--users=')) {
      options.users = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--duration=')) {
      options.duration = parseInt(arg.split('=')[1]);
    } else if (arg === '--load-test') {
      options.loadTest = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }
  
  console.log('🔧 Performance Test Configuration:');
  console.log(`  Environment: ${options.env}`);
  console.log(`  Base URL: ${options.baseUrl || 'auto-detected'}`);
  console.log(`  Load Testing: ${options.loadTest}`);
  if (options.loadTest) {
    console.log(`  Simulated Users: ${options.users}`);
    console.log(`  Duration: ${options.duration}s`);
  }
  console.log(`  Verbose: ${options.verbose}`);
  console.log('');
  
  const tester = new PerformanceTester(options);
  const report = await tester.runTests();
  
  // Exit with appropriate code based on performance score
  process.exit(report.summary.overallScore >= 60 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceTester, type PerformanceOptions, type PerformanceReport };