#!/usr/bin/env tsx

/**
 * WHOOP Webhook Compatibility Testing Script
 * 
 * Tests WHOOP webhook functionality in Cloudflare Workers environment
 * and prepares for dual-webhook strategy during migration.
 * 
 * Usage:
 *   bun run test:whoop-webhooks --env=staging
 *   bun run test:whoop-webhooks --env=local
 */

import crypto from 'crypto';

interface WebhookTestOptions {
  env: 'local' | 'staging' | 'production';
  endpoint?: string;
  verbose: boolean;
}

interface WebhookTestResult {
  endpoint: string;
  status: 'success' | 'error';
  responseTime: number;
  errorMessage?: string;
  details?: any;
}

class WhoopWebhookTester {
  private options: WebhookTestOptions;
  private whoopSecret: string;

  constructor(options: WebhookTestOptions) {
    this.options = options;
    this.whoopSecret = process.env.WHOOP_CLIENT_SECRET || 'test_secret';
  }

  /**
   * Run comprehensive webhook tests
   */
  async runTests(): Promise<WebhookTestResult[]> {
    console.log('🔗 Starting WHOOP webhook compatibility tests...');
    console.log(`Environment: ${this.options.env}`);
    
    const results: WebhookTestResult[] = [];
    
    // Test endpoints to validate
    const endpoints = this.getTestEndpoints();
    
    for (const endpoint of endpoints) {
      console.log(`\n📡 Testing: ${endpoint}`);
      
      const testResults = await Promise.all([
        this.testRecoveryWebhook(endpoint),
        this.testSleepWebhook(endpoint), 
        this.testCycleWebhook(endpoint),
        this.testWorkoutWebhook(endpoint),
        this.testBodyMeasurementWebhook(endpoint),
        this.testWebhookSecurity(endpoint),
      ]);
      
      results.push(...testResults);
    }
    
    this.printSummary(results);
    return results;
  }

  /**
   * Get test endpoints based on environment
   */
  private getTestEndpoints(): string[] {
    switch (this.options.env) {
      case 'local':
        return [
          'http://localhost:3000/api/webhooks/whoop',
          'http://localhost:8788/api/webhooks/whoop', // Wrangler dev
        ];
      case 'staging':
        return [
          this.options.endpoint || 'https://staging-swole-tracker.pages.dev/api/webhooks/whoop',
        ];
      case 'production':
        return [
          this.options.endpoint || 'https://swole-tracker.pages.dev/api/webhooks/whoop',
        ];
      default:
        throw new Error(`Unknown environment: ${this.options.env}`);
    }
  }

  /**
   * Test recovery webhook
   */
  private async testRecoveryWebhook(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = `${baseEndpoint}/recovery`;
    const startTime = Date.now();
    
    try {
      const payload = {
        id: 12345,
        user_id: 'test_user_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        score: {
          user_calibrating: false,
          recovery_score: 85,
          resting_heart_rate: 48,
          hrv_rmssd_milli: 45.2,
          spo2_percentage: 96.8,
          skin_temp_celsius: 33.2,
        },
      };
      
      const response = await this.sendWebhookRequest(endpoint, payload);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint: `${endpoint} (Recovery)`,
          status: 'success',
          responseTime,
          details: await response.json(),
        };
      } else {
        return {
          endpoint: `${endpoint} (Recovery)`,
          status: 'error',
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Recovery)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Test sleep webhook
   */
  private async testSleepWebhook(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = `${baseEndpoint}/sleep`;
    const startTime = Date.now();
    
    try {
      const payload = {
        id: 23456,
        user_id: 'test_user_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        start: '2024-01-01T22:30:00.000Z',
        end: '2024-01-02T07:30:00.000Z',
        timezone_offset: '-08:00',
        score: {
          stage_summary: {
            total_in_bed_time_milli: 32400000,
            total_awake_time_milli: 3600000,
            total_no_data_time_milli: 0,
            total_light_sleep_time_milli: 14400000,
            total_slow_wave_sleep_time_milli: 10800000,
            total_rem_sleep_time_milli: 3600000,
            sleep_cycle_count: 4,
            disturbance_count: 2,
          },
          sleep_needed: {
            baseline_milli: 28800000,
            need_from_sleep_debt_milli: 1800000,
            need_from_recent_strain_milli: 900000,
            need_from_recent_nap_milli: 0,
          },
          respiratory_rate: 14.2,
          sleep_performance_percentage: 88,
          sleep_consistency_percentage: 92,
          sleep_efficiency_percentage: 89,
        },
      };
      
      const response = await this.sendWebhookRequest(endpoint, payload);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint: `${endpoint} (Sleep)`,
          status: 'success',
          responseTime,
          details: await response.json(),
        };
      } else {
        return {
          endpoint: `${endpoint} (Sleep)`,
          status: 'error',
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Sleep)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Test cycle webhook
   */
  private async testCycleWebhook(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = `${baseEndpoint}/cycle`;
    const startTime = Date.now();
    
    try {
      const payload = {
        id: 34567,
        user_id: 'test_user_123',
        created_at: '2024-01-01T06:00:00.000Z',
        updated_at: '2024-01-02T06:00:00.000Z',
        start: '2024-01-01T06:00:00.000Z',
        end: '2024-01-02T06:00:00.000Z',
        timezone_offset: '-08:00',
        score: {
          strain: 12.5,
          average_heart_rate: 78,
          max_heart_rate: 165,
          kilojoule: 2800,
        },
      };
      
      const response = await this.sendWebhookRequest(endpoint, payload);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint: `${endpoint} (Cycle)`,
          status: 'success',
          responseTime,
          details: await response.json(),
        };
      } else {
        return {
          endpoint: `${endpoint} (Cycle)`,
          status: 'error',
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Cycle)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Test workout webhook
   */
  private async testWorkoutWebhook(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = baseEndpoint; // Main webhook endpoint
    const startTime = Date.now();
    
    try {
      const payload = {
        id: 45678,
        user_id: 'test_user_123',
        created_at: '2024-01-01T14:30:00.000Z',
        updated_at: '2024-01-01T15:45:00.000Z',
        start: '2024-01-01T14:30:00.000Z',
        end: '2024-01-01T15:45:00.000Z',
        timezone_offset: '-08:00',
        sport_id: 1, // Strength training
        score: {
          strain: 8.2,
          average_heart_rate: 125,
          max_heart_rate: 178,
          kilojoule: 850,
          percent_recorded: 98,
          distance_meter: 0,
          altitude_gain_meter: 0,
          altitude_change_meter: 0,
          zone_duration: {
            zone_zero_milli: 60000,
            zone_one_milli: 1800000,
            zone_two_milli: 2400000,
            zone_three_milli: 840000,
            zone_four_milli: 400000,
            zone_five_milli: 0,
          },
        },
      };
      
      const response = await this.sendWebhookRequest(endpoint, payload, 'workout.updated');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint: `${endpoint} (Workout)`,
          status: 'success',
          responseTime,
          details: await response.json(),
        };
      } else {
        return {
          endpoint: `${endpoint} (Workout)`,
          status: 'error',
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Workout)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Test body measurement webhook
   */
  private async testBodyMeasurementWebhook(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = `${baseEndpoint}/body-measurement`;
    const startTime = Date.now();
    
    try {
      const payload = {
        id: 56789,
        user_id: 'test_user_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        height_meter: 1.75,
        weight_kilogram: 75.5,
        max_heart_rate: 190,
      };
      
      const response = await this.sendWebhookRequest(endpoint, payload);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint: `${endpoint} (Body Measurement)`,
          status: 'success',
          responseTime,
          details: await response.json(),
        };
      } else {
        return {
          endpoint: `${endpoint} (Body Measurement)`,
          status: 'error',
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Body Measurement)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Test webhook security (HMAC verification)
   */
  private async testWebhookSecurity(baseEndpoint: string): Promise<WebhookTestResult> {
    const endpoint = `${baseEndpoint}/test`;
    const startTime = Date.now();
    
    try {
      const payload = { test: true };
      
      // Test with invalid signature
      const responseInvalid = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WHOOP-Signature': 'invalid_signature',
        },
        body: JSON.stringify(payload),
      });
      
      const responseTime = Date.now() - startTime;
      
      // Should return 401 Unauthorized for invalid signature
      if (responseInvalid.status === 401) {
        return {
          endpoint: `${endpoint} (Security)`,
          status: 'success',
          responseTime,
          details: 'Properly rejected invalid signature',
        };
      } else {
        return {
          endpoint: `${endpoint} (Security)`,
          status: 'error',
          responseTime,
          errorMessage: `Expected 401, got ${responseInvalid.status}`,
        };
      }
      
    } catch (error) {
      return {
        endpoint: `${endpoint} (Security)`,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  /**
   * Send webhook request with proper HMAC signature
   */
  private async sendWebhookRequest(
    endpoint: string, 
    payload: any, 
    eventType: string = 'test.event'
  ): Promise<Response> {
    const body = JSON.stringify(payload);
    
    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', this.whoopSecret)
      .update(body)
      .digest('hex');
    
    const headers = {
      'Content-Type': 'application/json',
      'X-WHOOP-Signature': signature,
      'X-WHOOP-Event': eventType,
      'User-Agent': 'WHOOP-Webhook-Test/1.0',
    };
    
    if (this.options.verbose) {
      console.log(`  → Request: POST ${endpoint}`);
      console.log(`  → Headers:`, headers);
      console.log(`  → Body:`, body.substring(0, 100) + '...');
    }
    
    return fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });
  }

  /**
   * Print test summary
   */
  private printSummary(results: WebhookTestResult[]): void {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    console.log('\n📊 Test Results Summary:');
    console.log('─────────────────────────');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${results.length}`);
    
    const avgResponseTime = results.reduce((acc, r) => acc + r.responseTime, 0) / results.length;
    console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  - ${r.endpoint}: ${r.errorMessage}`);
        });
    }
    
    console.log('\n🔄 Dual-Webhook Strategy Status:');
    if (successful === results.length) {
      console.log('✅ Ready for dual-webhook implementation');
    } else {
      console.log('⚠️  Issues detected - resolve before production migration');
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options: WebhookTestOptions = {
    env: 'local',
    verbose: false,
  };
  
  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as 'local' | 'staging' | 'production';
    } else if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }
  
  console.log('🔧 WHOOP Webhook Test Configuration:');
  console.log(`  Environment: ${options.env}`);
  console.log(`  Custom endpoint: ${options.endpoint || 'auto-detected'}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log('');
  
  const tester = new WhoopWebhookTester(options);
  const results = await tester.runTests();
  
  // Exit with error code if any tests failed
  const hasFailures = results.some(r => r.status === 'error');
  process.exit(hasFailures ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { WhoopWebhookTester, type WebhookTestOptions, type WebhookTestResult };