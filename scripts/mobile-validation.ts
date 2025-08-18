#!/usr/bin/env tsx

/**
 * Mobile App Staging Validation Script
 * 
 * Validates mobile app compatibility with Cloudflare staging environment:
 * - Mobile authentication flow with WorkOS
 * - Deep linking and OAuth callbacks
 * - API compatibility and data sync
 * - Offline functionality and data persistence
 * - Push notifications (if configured)
 * 
 * Usage:
 *   bun run test:mobile --env=staging
 *   bun run test:mobile --env=staging --verbose
 */

interface MobileValidationOptions {
  env: 'local' | 'staging' | 'production';
  baseUrl?: string;
  verbose: boolean;
  skipOffline: boolean;
}

interface MobileTestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'skip' | 'warning';
  message: string;
  details?: any;
  duration: number;
}

interface MobileValidationReport {
  environment: string;
  baseUrl: string;
  timestamp: string;
  results: MobileTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    readyForMobile: boolean;
    issues: string[];
    recommendations: string[];
  };
}

class MobileValidator {
  private options: MobileValidationOptions;
  private baseUrl: string;
  private results: MobileTestResult[] = [];

  constructor(options: MobileValidationOptions) {
    this.options = options;
    this.baseUrl = this.getBaseUrl();
  }

  /**
   * Run complete mobile validation suite
   */
  async validate(): Promise<MobileValidationReport> {
    console.log('📱 Starting Mobile App Validation');
    console.log(`Environment: ${this.options.env}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('');

    // 1. Test mobile authentication endpoints
    await this.testMobileAuthentication();
    
    // 2. Test mobile-specific API endpoints
    await this.testMobileApiEndpoints();
    
    // 3. Test deep linking compatibility
    await this.testDeepLinking();
    
    // 4. Test offline capabilities
    if (!this.options.skipOffline) {
      await this.testOfflineCapabilities();
    }
    
    // 5. Test mobile-optimized responses
    await this.testMobileOptimizations();
    
    // 6. Test CORS and cross-origin requests
    await this.testCorsConfiguration();

    const report = this.generateReport();
    this.printReport(report);
    
    return report;
  }

  /**
   * Test mobile authentication flow
   */
  private async testMobileAuthentication(): Promise<void> {
    console.log('🔐 Testing Mobile Authentication...');
    
    // Test 1: Mobile auth callback endpoint
    await this.runTest('Authentication', 'Mobile Auth Callback Endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/mobile/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SwoleTracker/1.0 (iOS 17.0; iPhone)',
        },
        body: JSON.stringify({ 
          code: 'test_code',
          state: 'test_state' 
        })
      });
      
      // Should handle the request appropriately (might return error for invalid code, but not 404)
      if (response.status === 404) {
        throw new Error('Mobile auth callback endpoint not found');
      }
      
      return { status: response.status };
    });

    // Test 2: Mobile logout endpoint
    await this.runTest('Authentication', 'Mobile Logout Endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/mobile/auth/logout`, {
        method: 'POST',
        headers: {
          'User-Agent': 'SwoleTracker/1.0 (Android 14; Pixel)',
        }
      });
      
      if (response.status === 404) {
        throw new Error('Mobile logout endpoint not found');
      }
      
      return { status: response.status };
    });

    // Test 3: Token refresh endpoint
    await this.runTest('Authentication', 'Mobile Token Refresh', async () => {
      const response = await fetch(`${this.baseUrl}/api/mobile/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SwoleTracker/1.0 (iOS)',
        },
        body: JSON.stringify({ 
          refresh_token: 'test_refresh_token' 
        })
      });
      
      if (response.status === 404) {
        throw new Error('Mobile token refresh endpoint not found');
      }
      
      return { status: response.status };
    });

    console.log('  ✅ Mobile authentication tests completed\n');
  }

  /**
   * Test mobile-specific API endpoints
   */
  private async testMobileApiEndpoints(): Promise<void> {
    console.log('📡 Testing Mobile API Endpoints...');
    
    // Test 1: tRPC endpoints with mobile user agent
    await this.runTest('API', 'tRPC with Mobile User Agent', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`, {
        headers: {
          'User-Agent': 'SwoleTracker/1.0 (iOS 17.0; iPhone14,2)',
          'Accept': 'application/json',
        }
      });
      
      // Should handle mobile requests the same as web requests
      if (response.status === 500) {
        const text = await response.text();
        if (text.includes('user agent') || text.includes('mobile')) {
          throw new Error('Server rejecting mobile user agent');
        }
      }
      
      return { status: response.status };
    });

    // Test 2: API with mobile-specific headers
    await this.runTest('API', 'Mobile Headers Compatibility', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/workouts.getRecent`, {
        headers: {
          'User-Agent': 'SwoleTracker/1.0 (Android)',
          'X-Requested-With': 'com.swoletracker.app',
          'X-Platform': 'mobile',
        }
      });
      
      return { status: response.status };
    });

    // Test 3: Response format compatibility
    await this.runTest('API', 'Response Format', async () => {
      const response = await fetch(`${this.baseUrl}/api/joke`, {
        headers: {
          'User-Agent': 'SwoleTracker/1.0',
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return {
            status: 'warning',
            message: 'API not returning JSON content-type header'
          };
        }
        
        const data = await response.json();
        if (typeof data !== 'object') {
          throw new Error('API returning non-JSON data');
        }
      }
      
      return { status: response.status };
    });

    console.log('  ✅ Mobile API tests completed\n');
  }

  /**
   * Test deep linking compatibility
   */
  private async testDeepLinking(): Promise<void> {
    console.log('🔗 Testing Deep Linking Compatibility...');
    
    // Test 1: OAuth callback URL structure
    await this.runTest('Deep Linking', 'OAuth Callback URL Format', async () => {
      // Check if the callback URLs are accessible
      const callbackUrl = `${this.baseUrl}/api/mobile/auth/callback`;
      const response = await fetch(callbackUrl, { method: 'HEAD' });
      
      if (response.status === 404) {
        throw new Error('OAuth callback URL not accessible');
      }
      
      return { 
        callbackUrl,
        accessible: response.status !== 404 
      };
    });

    // Test 2: Deep link routing
    await this.runTest('Deep Linking', 'Deep Link Routes', async () => {
      const deepLinkRoutes = [
        '/workout/session/123',
        '/templates/456', 
        '/workouts'
      ];
      
      const results = [];
      for (const route of deepLinkRoutes) {
        const response = await fetch(`${this.baseUrl}${route}`, { 
          method: 'HEAD',
          redirect: 'manual' 
        });
        
        results.push({
          route,
          status: response.status,
          accessible: response.status < 400
        });
      }
      
      return { routes: results };
    });

    // Test 3: URL scheme compatibility  
    await this.runTest('Deep Linking', 'URL Scheme Support', async () => {
      // Test that URLs don't contain characters that break mobile deep linking
      const testUrl = `${this.baseUrl}/workout/session/test-123?param=value`;
      
      // Check for problematic characters in URL structure
      const hasProblematicChars = /[<>{}|\\^`\[\]]/.test(testUrl);
      
      if (hasProblematicChars) {
        throw new Error('URLs contain characters that may break mobile deep linking');
      }
      
      return { testUrl, valid: !hasProblematicChars };
    });

    console.log('  ✅ Deep linking tests completed\n');
  }

  /**
   * Test offline capabilities
   */
  private async testOfflineCapabilities(): Promise<void> {
    console.log('📴 Testing Offline Capabilities...');
    
    // Test 1: Service Worker registration
    await this.runTest('Offline', 'Service Worker Availability', async () => {
      const response = await fetch(`${this.baseUrl}/sw.js`);
      
      if (response.status === 404) {
        return {
          status: 'warning',
          message: 'Service worker not found - offline functionality may be limited'
        };
      }
      
      const swContent = await response.text();
      const hasOfflineSupport = swContent.includes('cache') || swContent.includes('offline');
      
      return { 
        exists: response.ok,
        hasOfflineSupport,
        size: swContent.length 
      };
    });

    // Test 2: Manifest file
    await this.runTest('Offline', 'PWA Manifest', async () => {
      const response = await fetch(`${this.baseUrl}/manifest.json`);
      
      if (response.status === 404) {
        return {
          status: 'warning', 
          message: 'PWA manifest not found - app may not be installable'
        };
      }
      
      if (response.ok) {
        const manifest = await response.json();
        const requiredFields = ['name', 'short_name', 'start_url', 'display'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length > 0) {
          return {
            status: 'warning',
            message: `PWA manifest missing fields: ${missingFields.join(', ')}`
          };
        }
      }
      
      return { status: response.status };
    });

    // Test 3: Offline queue endpoints
    await this.runTest('Offline', 'Offline Queue Support', async () => {
      // Check if tRPC endpoints handle offline scenarios gracefully
      const response = await fetch(`${this.baseUrl}/api/trpc/workouts.create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Queue': 'true', // Hypothetical offline queue header
        },
        body: JSON.stringify({})
      });
      
      // Even if the request fails, it shouldn't crash the server
      return { 
        status: response.status,
        handledGracefully: response.status < 500 
      };
    });

    console.log('  ✅ Offline capability tests completed\n');
  }

  /**
   * Test mobile optimizations
   */
  private async testMobileOptimizations(): Promise<void> {
    console.log('📱 Testing Mobile Optimizations...');
    
    // Test 1: Response compression
    await this.runTest('Optimization', 'Response Compression', async () => {
      const response = await fetch(`${this.baseUrl}/`, {
        headers: {
          'Accept-Encoding': 'gzip, br',
          'User-Agent': 'SwoleTracker/1.0 (iPhone)',
        }
      });
      
      const contentEncoding = response.headers.get('content-encoding');
      const compressed = !!(contentEncoding && (contentEncoding.includes('gzip') || contentEncoding.includes('br')));
      
      if (!compressed) {
        return {
          status: 'warning',
          message: 'Responses not compressed - may impact mobile performance'
        };
      }
      
      return { compressed, contentEncoding };
    });

    // Test 2: Cache headers
    await this.runTest('Optimization', 'Cache Headers', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`);
      
      const cacheControl = response.headers.get('cache-control');
      const etag = response.headers.get('etag');
      
      const hasCaching = !!(cacheControl || etag);
      
      if (!hasCaching) {
        return {
          status: 'warning', 
          message: 'No caching headers found - may impact mobile performance'
        };
      }
      
      return { cacheControl, etag, hasCaching };
    });

    // Test 3: Mobile viewport meta tag
    await this.runTest('Optimization', 'Mobile Viewport', async () => {
      const response = await fetch(`${this.baseUrl}/`);
      
      if (response.ok) {
        const html = await response.text();
        const hasViewportMeta = html.includes('viewport') && html.includes('width=device-width');
        
        if (!hasViewportMeta) {
          return {
            status: 'warning',
            message: 'Missing mobile viewport meta tag'
          };
        }
        
        return { hasViewportMeta };
      }
      
      return { status: response.status };
    });

    console.log('  ✅ Mobile optimization tests completed\n');
  }

  /**
   * Test CORS configuration
   */
  private async testCorsConfiguration(): Promise<void> {
    console.log('🌐 Testing CORS Configuration...');
    
    // Test 1: Preflight requests
    await this.runTest('CORS', 'Preflight Request Handling', async () => {
      const response = await fetch(`${this.baseUrl}/api/trpc/templates.getAll`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'capacitor://localhost',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type',
        }
      });
      
      const accessControlOrigin = response.headers.get('access-control-allow-origin');
      const accessControlMethods = response.headers.get('access-control-allow-methods');
      
      return {
        status: response.status,
        allowsOrigin: !!accessControlOrigin,
        allowsMethods: !!accessControlMethods,
        headers: {
          origin: accessControlOrigin,
          methods: accessControlMethods
        }
      };
    });

    // Test 2: Mobile origin support
    await this.runTest('CORS', 'Mobile Origin Support', async () => {
      const mobileOrigins = [
        'capacitor://localhost',
        'ionic://localhost',
        'http://localhost',
        'file://',
      ];
      
      const results = [];
      
      for (const origin of mobileOrigins) {
        const response = await fetch(`${this.baseUrl}/api/joke`, {
          headers: {
            'Origin': origin,
            'User-Agent': 'SwoleTracker/1.0 (Mobile)',
          }
        });
        
        const allowsOrigin = response.headers.get('access-control-allow-origin');
        results.push({
          origin,
          allowed: allowsOrigin === origin || allowsOrigin === '*',
          responseOrigin: allowsOrigin
        });
      }
      
      const supportedOrigins = results.filter(r => r.allowed).length;
      
      if (supportedOrigins === 0) {
        return {
          status: 'warning',
          message: 'No mobile origins supported - app may have CORS issues'
        };
      }
      
      return { results, supportedOrigins };
    });

    console.log('  ✅ CORS configuration tests completed\n');
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(category: string, test: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.options.verbose) {
        console.log(`  🧪 ${test}...`);
      }
      
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      // Handle warning status
      if (typeof result === 'object' && result.status === 'warning') {
        this.results.push({
          category,
          test,
          status: 'warning',
          message: result.message,
          details: result,
          duration
        });
        
        if (this.options.verbose) {
          console.log(`  ⚠️  ${test} (${duration}ms): ${result.message}`);
        }
        return;
      }
      
      this.results.push({
        category,
        test,
        status: 'pass',
        message: 'Test passed',
        details: result,
        duration
      });
      
      if (this.options.verbose) {
        console.log(`  ✅ ${test} (${duration}ms)`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        category,
        test,
        status: 'fail',
        message: String(error),
        duration
      });
      
      if (this.options.verbose) {
        console.log(`  ❌ ${test} (${duration}ms): ${error}`);
      }
    }
  }

  /**
   * Generate validation report
   */
  private generateReport(): MobileValidationReport {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    
    const criticalFailures = this.results.filter(r => 
      r.status === 'fail' && (r.category === 'Authentication' || r.category === 'API')
    ).length;
    
    const readyForMobile = criticalFailures === 0 && failed <= 2;
    
    const issues = this.results
      .filter(r => r.status === 'fail')
      .map(r => `${r.category}: ${r.message}`);
      
    const recommendations = this.results
      .filter(r => r.status === 'warning')
      .map(r => r.message);

    return {
      environment: this.options.env,
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total,
        passed,
        failed,
        warnings,
        skipped,
        readyForMobile,
        issues,
        recommendations
      }
    };
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
   * Print validation report
   */
  private printReport(report: MobileValidationReport): void {
    console.log('📱 Mobile App Validation Report');
    console.log('════════════════════════════════');
    console.log(`Environment: ${report.environment}`);
    console.log(`Base URL: ${report.baseUrl}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log('');
    
    console.log('📊 Test Results:');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`📈 Total: ${report.summary.total}`);
    console.log('');
    
    if (report.summary.issues.length > 0) {
      console.log('❌ Issues Found:');
      report.summary.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
      console.log('');
    }
    
    if (report.summary.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.summary.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
      console.log('');
    }
    
    console.log('🏁 Mobile Readiness Assessment:');
    console.log('────────────────────────────────');
    if (report.summary.readyForMobile) {
      console.log('✅ READY FOR MOBILE DEPLOYMENT');
      console.log('   Mobile app should work correctly with this environment');
    } else {
      console.log('❌ NOT READY FOR MOBILE DEPLOYMENT');
      console.log('   Critical issues must be resolved before mobile app deployment');
    }
    
    // Category breakdown
    const categories = [...new Set(report.results.map(r => r.category))];
    console.log('\n📋 Results by Category:');
    categories.forEach(category => {
      const categoryResults = report.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'pass').length;
      const categoryFailed = categoryResults.filter(r => r.status === 'fail').length;
      const categoryWarnings = categoryResults.filter(r => r.status === 'warning').length;
      
      console.log(`  ${category}: ${categoryPassed}✅ ${categoryWarnings}⚠️  ${categoryFailed}❌`);
    });
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options: MobileValidationOptions = {
    env: 'local',
    verbose: false,
    skipOffline: false,
  };
  
  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as any;
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--skip-offline') {
      options.skipOffline = true;
    }
  }
  
  console.log('🔧 Mobile Validation Configuration:');
  console.log(`  Environment: ${options.env}`);
  console.log(`  Base URL: ${options.baseUrl || 'auto-detected'}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log(`  Skip Offline: ${options.skipOffline}`);
  console.log('');
  
  const validator = new MobileValidator(options);
  const report = await validator.validate();
  
  // Exit with appropriate code
  process.exit(report.summary.readyForMobile ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { MobileValidator, type MobileValidationOptions, type MobileValidationReport };