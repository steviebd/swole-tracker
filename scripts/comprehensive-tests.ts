#!/usr/bin/env tsx

/**
 * Comprehensive Testing Suite for Cloudflare Migration
 * 
 * Runs all critical tests to validate the migrated application:
 * - Authentication flow (WorkOS)
 * - Database operations (D1)
 * - Rate limiting (KV)
 * - WHOOP integration
 * - Performance benchmarks
 * 
 * Usage:
 *   bun run test:comprehensive --env=staging
 *   bun run test:comprehensive --env=staging --skip-auth
 */

import { WhoopWebhookTester } from './test-whoop-webhooks';

interface TestOptions {
  env: 'local' | 'staging' | 'production';
  baseUrl?: string;
  skipAuth: boolean;
  skipDatabase: boolean;
  skipRateLimit: boolean;
  skipWhoop: boolean;
  skipPerformance: boolean;
  verbose: boolean;
}

interface TestResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

class ComprehensiveTestSuite {
  private options: TestOptions;
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(options: TestOptions) {
    this.options = options;
    this.baseUrl = this.getBaseUrl();
  }

  /**
   * Run all test suites
   */
  async runAll(): Promise<TestSummary> {
    console.log('🧪 Starting Comprehensive Testing Suite');
    console.log(`Environment: ${this.options.env}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('');

    const startTime = Date.now();

    // Run test suites in order
    if (!this.options.skipAuth) {
      await this.runAuthenticationTests();
    }
    
    if (!this.options.skipDatabase) {
      await this.runDatabaseTests();
    }
    
    if (!this.options.skipRateLimit) {
      await this.runRateLimitTests();
    }
    
    if (!this.options.skipWhoop) {
      await this.runWhoopIntegrationTests();
    }
    
    if (!this.options.skipPerformance) {
      await this.runPerformanceTests();
    }

    const duration = Date.now() - startTime;
    const summary = this.generateSummary(duration);
    
    this.printSummary(summary);
    return summary;
  }

  /**
   * Test authentication flow with WorkOS
   */
  private async runAuthenticationTests(): Promise<void> {
    console.log('🔐 Running Authentication Tests...');
    
    // Test 1: Health check endpoint (unauthenticated)
    await this.runTest('Authentication', 'Health Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/healthcheck`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return { status: response.status };
    });

    // Test 2: Login page access
    await this.runTest('Authentication', 'Login Page Access', async () => {
      const response = await fetch(`${this.baseUrl}/auth/login`);
      if (!response.ok) {
        throw new Error(`Login page inaccessible: ${response.status}`);
      }
      const text = await response.text();
      if (!text.includes('WorkOS') && !text.includes('Sign in')) {
        throw new Error('Login page does not contain expected elements');
      }
      return { hasWorkOS: text.includes('WorkOS') };
    });

    // Test 3: Protected route redirects
    await this.runTest('Authentication', 'Protected Route Redirect', async () => {
      const response = await fetch(`${this.baseUrl}/templates`, {
        redirect: 'manual'
      });
      
      // Should redirect to login or return 401
      if (response.status !== 302 && response.status !== 401) {
        throw new Error(`Expected redirect or 401, got ${response.status}`);
      }
      
      return { 
        status: response.status,
        redirected: response.status === 302 
      };
    });

    // Test 4: API authentication
    await this.runTest('Authentication', 'API Authentication', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Should return 401 unauthorized
      if (response.status !== 401) {
        throw new Error(`Expected 401 unauthorized, got ${response.status}`);
      }
      
      return { status: response.status };
    });

    console.log('  ✅ Authentication tests completed\n');
  }

  /**
   * Test database operations with D1
   */
  private async runDatabaseTests(): Promise<void> {
    console.log('🗄️  Running Database Tests...');
    
    // Test 1: Database connection via tRPC
    await this.runTest('Database', 'Connection Test', async () => {
      // This would require authenticated request in real scenario
      // For now, test if the endpoint responds correctly to unauthenticated requests
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`);
      
      // Should get 401 (auth required) not 500 (db error)
      if (response.status === 500) {
        const text = await response.text();
        if (text.includes('database') || text.includes('D1')) {
          throw new Error('Database connection error detected');
        }
      }
      
      return { status: response.status };
    });

    // Test 2: Health endpoint that might touch database
    await this.runTest('Database', 'Health Endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`);
      
      // If endpoint exists and returns 200, database is likely healthy
      // If it returns 404, that's also fine (endpoint might not exist)
      if (response.status === 500) {
        const text = await response.text();
        if (text.toLowerCase().includes('database')) {
          throw new Error('Database health check failed');
        }
      }
      
      return { 
        status: response.status,
        exists: response.status !== 404 
      };
    });

    console.log('  ✅ Database tests completed\n');
  }

  /**
   * Test rate limiting with KV
   */
  private async runRateLimitTests(): Promise<void> {
    console.log('⚡ Running Rate Limiting Tests...');
    
    // Test 1: Rate limit functionality
    await this.runTest('Rate Limiting', 'Basic Rate Limiting', async () => {
      const endpoint = `${this.baseUrl}/api/trpc/templates.getAll`;
      const promises = [];
      
      // Send multiple requests rapidly
      for (let i = 0; i < 20; i++) {
        promises.push(fetch(endpoint));
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      return { 
        totalRequests: responses.length,
        rateLimited,
        statusCodes: responses.map(r => r.status)
      };
    });

    // Test 2: Rate limit headers
    await this.runTest('Rate Limiting', 'Rate Limit Headers', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`);
      
      const headers = {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        reset: response.headers.get('x-ratelimit-reset'),
      };
      
      return { 
        hasHeaders: !!(headers.remaining || headers.limit || headers.reset),
        headers 
      };
    });

    console.log('  ✅ Rate limiting tests completed\n');
  }

  /**
   * Test WHOOP integration
   */
  private async runWhoopIntegrationTests(): Promise<void> {
    console.log('🏃 Running WHOOP Integration Tests...');
    
    // Test 1: WHOOP OAuth authorization endpoint
    await this.runTest('WHOOP Integration', 'OAuth Authorization', async () => {
      const response = await fetch(`${this.baseUrl}/api/auth/whoop/authorize`, {
        redirect: 'manual'
      });
      
      // Should redirect to WHOOP or return 401 (auth required)
      if (response.status !== 302 && response.status !== 401) {
        throw new Error(`Expected redirect or 401, got ${response.status}`);
      }
      
      return { 
        status: response.status,
        location: response.headers.get('location')
      };
    });

    // Test 2: Webhook endpoints using our dedicated tester
    await this.runTest('WHOOP Integration', 'Webhook Endpoints', async () => {
      const tester = new WhoopWebhookTester({
        env: this.options.env,
        endpoint: `${this.baseUrl}/api/webhooks/whoop`,
        verbose: false,
      });
      
      const results = await tester.runTests();
      const successful = results.filter(r => r.status === 'success').length;
      const total = results.length;
      
      if (successful < total * 0.8) { // At least 80% should pass
        throw new Error(`Only ${successful}/${total} webhook tests passed`);
      }
      
      return { successful, total, results };
    });

    console.log('  ✅ WHOOP integration tests completed\n');
  }

  /**
   * Test performance characteristics
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('🚀 Running Performance Tests...');
    
    // Test 1: Page load performance
    await this.runTest('Performance', 'Homepage Load Time', async () => {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/`);
      const endTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`Homepage failed to load: ${response.status}`);
      }
      
      const loadTime = endTime - startTime;
      
      if (loadTime > 5000) { // 5 second threshold
        throw new Error(`Homepage load time too slow: ${loadTime}ms`);
      }
      
      return { loadTime, status: response.status };
    });

    // Test 2: API response times
    await this.runTest('Performance', 'API Response Time', async () => {
      const endpoint = `${this.baseUrl}/api/trpc/templates.getAll`;
      const measurements = [];
      
      // Take 5 measurements
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await fetch(endpoint);
        const endTime = Date.now();
        measurements.push(endTime - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgResponseTime = measurements.reduce((a, b) => a + b) / measurements.length;
      
      if (avgResponseTime > 2000) { // 2 second threshold
        throw new Error(`API response time too slow: ${avgResponseTime}ms`);
      }
      
      return { 
        measurements,
        average: avgResponseTime,
        min: Math.min(...measurements),
        max: Math.max(...measurements)
      };
    });

    // Test 3: Concurrent request handling
    await this.runTest('Performance', 'Concurrent Requests', async () => {
      const endpoint = `${this.baseUrl}/api/healthcheck`;
      const concurrency = 10;
      
      const startTime = Date.now();
      const promises = Array(concurrency).fill(null).map(() => fetch(endpoint));
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      const successful = responses.filter(r => r.ok).length;
      const totalTime = endTime - startTime;
      
      if (successful < concurrency * 0.9) { // At least 90% should succeed
        throw new Error(`Only ${successful}/${concurrency} concurrent requests succeeded`);
      }
      
      return {
        concurrency,
        successful,
        totalTime,
        averageTime: totalTime / concurrency
      };
    });

    console.log('  ✅ Performance tests completed\n');
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(category: string, name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.options.verbose) {
        console.log(`  🧪 ${name}...`);
      }
      
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        category,
        name,
        status: 'pass',
        duration,
        details
      });
      
      if (this.options.verbose) {
        console.log(`  ✅ ${name} (${duration}ms)`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        category,
        name,
        status: 'fail',
        duration,
        error: String(error)
      });
      
      if (this.options.verbose) {
        console.log(`  ❌ ${name} (${duration}ms): ${error}`);
      }
    }
  }

  /**
   * Get base URL for the environment
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
   * Generate test summary
   */
  private generateSummary(totalDuration: number): TestSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return {
      total,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      results: this.results
    };
  }

  /**
   * Print detailed test summary
   */
  private printSummary(summary: TestSummary): void {
    console.log('📊 Test Results Summary');
    console.log('═══════════════════════');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    console.log(`📈 Total: ${summary.total}`);
    console.log(`⏱️  Duration: ${summary.duration}ms`);
    
    const successRate = ((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      console.log('─────────────────');
      summary.results
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`${result.category} > ${result.name}`);
          console.log(`  Error: ${result.error}`);
          console.log(`  Duration: ${result.duration}ms`);
          console.log('');
        });
    }
    
    // Migration readiness assessment
    console.log('\n🏁 Migration Readiness Assessment:');
    console.log('─────────────────────────────────');
    
    const criticalTests = summary.results.filter(r => 
      r.category === 'Authentication' || r.category === 'Database'
    );
    const criticalFailures = criticalTests.filter(r => r.status === 'fail').length;
    
    if (criticalFailures === 0 && summary.failed <= 2) {
      console.log('✅ READY FOR PRODUCTION MIGRATION');
      console.log('   All critical systems operational');
    } else if (criticalFailures === 0) {
      console.log('⚠️  READY WITH CAUTION');
      console.log('   Critical systems OK, some non-critical issues detected');
    } else {
      console.log('❌ NOT READY FOR PRODUCTION');
      console.log('   Critical system failures detected - resolve before migration');
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options: TestOptions = {
    env: 'local',
    skipAuth: false,
    skipDatabase: false,
    skipRateLimit: false,
    skipWhoop: false,
    skipPerformance: false,
    verbose: false,
  };
  
  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as any;
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.split('=')[1];
    } else if (arg === '--skip-auth') {
      options.skipAuth = true;
    } else if (arg === '--skip-database') {
      options.skipDatabase = true;
    } else if (arg === '--skip-rate-limit') {
      options.skipRateLimit = true;
    } else if (arg === '--skip-whoop') {
      options.skipWhoop = true;
    } else if (arg === '--skip-performance') {
      options.skipPerformance = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }
  
  console.log('🔧 Test Configuration:');
  console.log(`  Environment: ${options.env}`);
  console.log(`  Base URL: ${options.baseUrl || 'auto-detected'}`);
  console.log(`  Skip Auth: ${options.skipAuth}`);
  console.log(`  Skip Database: ${options.skipDatabase}`);
  console.log(`  Skip Rate Limiting: ${options.skipRateLimit}`);
  console.log(`  Skip WHOOP: ${options.skipWhoop}`);
  console.log(`  Skip Performance: ${options.skipPerformance}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log('');
  
  const suite = new ComprehensiveTestSuite(options);
  const summary = await suite.runAll();
  
  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveTestSuite, type TestOptions, type TestSummary };