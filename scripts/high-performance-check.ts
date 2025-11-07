#!/usr/bin/env bun
/**
 * High-Performance Check Script for Swole Tracker
 *
 * This script replaces the traditional `bun check` command with a highly optimized
 * version that runs linting, type checking, and testing in parallel with intelligent
 * caching to dramatically improve performance on M1 MacBooks.
 *
 * Key Features:
 * - Parallel task execution (lint, typecheck, test)
 * - Intelligent file change detection
 * - Persistent caching with smart invalidation
 * - Performance monitoring and profiling
 * - Resource-aware worker allocation
 * - Detailed performance reporting
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

// Configuration
const CONFIG = {
  cacheDir: ".cache/high-performance-check",
  maxWorkers: Math.min(4, Math.max(1, Math.floor(os.cpus().length / 2))),
  performanceLog: ".cache/performance.log",
  gitRefFile: ".cache/git-ref",
} as const;

// Task definitions
interface Task {
  name: string;
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  priority: "high" | "medium" | "low";
  cacheable: boolean;
  dependencies?: string[];
}

// Test failure information
interface TestFailure {
  testName: string;
  filePath: string;
  errorMessage: string;
  stackTrace?: string;
}

interface TestResult {
  passed: number;
  failed: number;
  total: number;
  failures: TestFailure[];
}

const TASKS: Record<string, Task> = {
  lint: {
    name: "lint",
    command: [
      "bunx",
      "eslint",
      "--config",
      "eslint.performance.config.js",
      "src/**/*.{ts,tsx}",
      "--max-warnings",
      "100",
      "--cache",
      "--cache-location",
      ".cache/eslint",
    ],
    priority: "high",
    cacheable: true,
  },
  typecheck: {
    name: "typecheck",
    command: [
      "bunx",
      "tsc",
      "--project",
      "tsconfig.performance.json",
      "--noEmit",
    ],
    priority: "high",
    cacheable: true,
  },
  test: {
    name: "test",
    command: [
      "bunx",
      "vitest",
      "run",
      "--config",
      "vitest.performance.config.ts",
    ],
    priority: "medium",
    cacheable: true,
  },
};

// Performance monitoring
class PerformanceMonitor {
  private startTime: number = Date.now();
  private taskStartTimes: Map<string, number> = new Map();
  private metrics: Map<string, any> = new Map();

  startTask(taskName: string) {
    this.taskStartTimes.set(taskName, Date.now());
  }

  endTask(taskName: string, success: boolean, output?: string) {
    const startTime = this.taskStartTimes.get(taskName);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.set(taskName, {
        duration,
        success,
        timestamp: Date.now(),
        output: output?.slice(0, 1000), // Limit output size
      });
    }
  }

  getMetrics() {
    return {
      totalDuration: Date.now() - this.startTime,
      tasks: Object.fromEntries(this.metrics),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
      },
    };
  }

  async saveMetrics() {
    const metrics = this.getMetrics();
    await fs.mkdir(path.dirname(CONFIG.performanceLog), { recursive: true });
    await fs.appendFile(CONFIG.performanceLog, JSON.stringify(metrics) + "\n");
  }
}

// Cache management
class CacheManager {
  private cache: Map<string, { hash: string; timestamp: number; result: any }> =
    new Map();

  async loadCache() {
    try {
      const cacheData = await fs.readFile(
        path.join(CONFIG.cacheDir, "cache.json"),
        "utf-8",
      );
      this.cache = new Map(JSON.parse(cacheData));
    } catch {
      // Cache doesn't exist or is invalid
    }
  }

  async saveCache() {
    await fs.mkdir(CONFIG.cacheDir, { recursive: true });
    await fs.writeFile(
      path.join(CONFIG.cacheDir, "cache.json"),
      JSON.stringify(Array.from(this.cache.entries())),
    );
  }

  async getCacheKey(taskName: string, files: string[]): Promise<string> {
    const fileHashes = await Promise.all(
      files.map((file) => this.getFileHash(file)),
    );
    return crypto
      .createHash("md5")
      .update(`${taskName}:${fileHashes.join("")}`)
      .digest("hex");
  }

  private async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash("md5").update(content).digest("hex");
    } catch {
      return "";
    }
  }

  isCached(taskName: string, cacheKey: string): boolean {
    const cached = this.cache.get(taskName);
    return cached?.hash === cacheKey;
  }

  getCachedResult(taskName: string) {
    return this.cache.get(taskName)?.result;
  }

  setCacheResult(taskName: string, cacheKey: string, result: any) {
    this.cache.set(taskName, {
      hash: cacheKey,
      timestamp: Date.now(),
      result,
    });
  }
}

// File change detection
class ChangeDetector {
  private lastGitRef: string = "";

  async getChangedFiles(): Promise<string[]> {
    try {
      // Get current git ref
      const currentRef = await this.execCommand("git", ["rev-parse", "HEAD"]);

      // Load last ref
      try {
        this.lastGitRef = await fs.readFile(CONFIG.gitRefFile, "utf-8");
      } catch {
        this.lastGitRef = "";
      }

      // If no previous ref or refs are different, get changed files
      if (!this.lastGitRef || this.lastGitRef !== currentRef) {
        const changedFiles = await this.getFilesChangedSince(
          this.lastGitRef || "HEAD~1",
        );
        await fs.writeFile(CONFIG.gitRefFile, currentRef);
        return changedFiles;
      }

      return [];
    } catch {
      // Fallback: check all files
      return await this.getAllSourceFiles();
    }
  }

  private async getFilesChangedSince(ref: string): Promise<string[]> {
    try {
      const output = await this.execCommand("git", [
        "diff",
        "--name-only",
        ref,
      ]);
      return output
        .split("\n")
        .filter(
          (line) => line && (line.endsWith(".ts") || line.endsWith(".tsx")),
        );
    } catch {
      return [];
    }
  }

  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    async function scanDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
        ) {
          await scanDir(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        ) {
          files.push(fullPath);
        }
      }
    }

    await scanDir("src");
    return files;
  }

  private async execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: "pipe" });
      let output = "";

      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.stderr?.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
        }
      });
    });
  }
}

// Test result parser
class TestResultParser {
  parseVitestOutput(output: string): TestResult | null {
    try {
      // Try to parse JSON output first (if Vitest is configured to output JSON)
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        return this.parseJsonResult(jsonData);
      }

      // Fall back to parsing text output
      return this.parseTextOutput(output);
    } catch {
      return this.parseTextOutput(output);
    }
  }

  private parseJsonResult(data: any): TestResult {
    const failures: TestFailure[] = [];

    if (data.testResults) {
      for (const testResult of data.testResults) {
        if (testResult.status === "failed" && testResult.assertionResults) {
          for (const assertion of testResult.assertionResults) {
            if (assertion.status === "failed") {
              failures.push({
                testName: assertion.title,
                filePath: testResult.testFilePath,
                errorMessage:
                  assertion.failureMessages?.join("\n") || "Unknown error",
                stackTrace: assertion.failureMessages?.join("\n") || undefined,
              });
            }
          }
        }
      }
    }

    return {
      passed: data.numPassedTests || 0,
      failed: data.numFailedTests || 0,
      total: data.numTotalTests || 0,
      failures,
    };
  }

  private parseTextOutput(output: string): TestResult {
    const failures: TestFailure[] = [];
    const lines = output.split("\n");

    let currentTest: Partial<TestFailure> | null = null;
    let collectingStack = false;
    let stackLines: string[] = [];

    for (const line of lines) {
      // Look for test failure patterns
      const failMatch = line.match(/FAIL\s+(.+?)\s*$/);
      if (failMatch) {
        // Save previous test if exists
        if (currentTest && currentTest.testName) {
          failures.push(currentTest as TestFailure);
        }

        currentTest = {
          filePath: failMatch[1],
          testName: "",
          errorMessage: "",
        };
        collectingStack = false;
        stackLines = [];
        continue;
      }

      // Look for test name
      const testMatch = line.match(/^\s*×\s+(.+?)\s*$/);
      if (testMatch && currentTest) {
        currentTest.testName = testMatch[1];
        continue;
      }

      // Look for error message start
      if (
        line.includes("Error:") ||
        line.includes("AssertionError") ||
        line.includes("Expected")
      ) {
        if (currentTest) {
          currentTest.errorMessage = line.trim();
          collectingStack = true;
          stackLines = [line.trim()];
        }
        continue;
      }

      // Collect stack trace lines
      if (
        collectingStack &&
        currentTest &&
        (line.includes("at ") || line.trim().startsWith("at"))
      ) {
        stackLines.push(line.trim());
        continue;
      }

      // End of error block (empty line or next test)
      if (collectingStack && line.trim() === "" && stackLines.length > 0) {
        if (currentTest) {
          currentTest.stackTrace = stackLines.join("\n");
          collectingStack = false;
        }
      }
    }

    // Save the last test
    if (currentTest && currentTest.testName) {
      if (collectingStack && stackLines.length > 0) {
        currentTest.stackTrace = stackLines.join("\n");
      }
      failures.push(currentTest as TestFailure);
    }

    // Extract summary information
    const summaryMatch = output.match(
      /Tests?:\s*(\d+)\s*(?:passed|failed|total)/i,
    );
    const passedMatch = output.match(/(\d+)\s*passed/i);
    const failedMatch = output.match(/(\d+)\s*failed/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : failures.length;
    const total = passed + failed;

    return {
      passed,
      failed,
      total,
      failures,
    };
  }
}

// Task executor
class TaskExecutor {
  private runningTasks: Map<string, Promise<any>> = new Map();
  private results: Map<
    string,
    {
      success: boolean;
      output: string;
      duration: number;
      testResult?: TestResult;
    }
  > = new Map();
  private testParser = new TestResultParser();

  async executeTasks(
    tasks: Task[],
    changedFiles: string[],
    cacheManager: CacheManager,
    monitor: PerformanceMonitor,
  ): Promise<boolean> {
    const taskPromises = tasks.map((task) =>
      this.executeTask(task, changedFiles, cacheManager, monitor),
    );

    try {
      await Promise.all(taskPromises);
      return Array.from(this.results.values()).every(
        (result) => result.success,
      );
    } catch {
      return false;
    }
  }

  private async executeTask(
    task: Task,
    changedFiles: string[],
    cacheManager: CacheManager,
    monitor: PerformanceMonitor,
  ): Promise<void> {
    monitor.startTask(task.name);

    try {
      // Check cache first
      if (task.cacheable) {
        const cacheKey = await cacheManager.getCacheKey(
          task.name,
          changedFiles,
        );
        if (cacheManager.isCached(task.name, cacheKey)) {
          const cachedResult = cacheManager.getCachedResult(task.name);
          this.results.set(task.name, cachedResult);
          monitor.endTask(task.name, cachedResult.success, "CACHED");
          console.log(`✅ ${task.name} (cached)`);

          // Display cached test failures if any
          if (
            cachedResult.testResult &&
            cachedResult.testResult.failures.length > 0
          ) {
            this.displayTestFailures(cachedResult.testResult);
          }
          return;
        }
      }

      // Execute task
      const result = await this.runCommand(task);

      // Parse test results if this is a test task and it failed
      if (task.name === "test" && !result.success) {
        result.testResult = this.testParser.parseVitestOutput(result.output);
      }

      this.results.set(task.name, result);

      // Cache result if successful and cacheable
      if (task.cacheable && result.success) {
        const cacheKey = await cacheManager.getCacheKey(
          task.name,
          changedFiles,
        );
        cacheManager.setCacheResult(task.name, cacheKey, result);
      }

      monitor.endTask(task.name, result.success, result.output);
      console.log(
        `${result.success ? "✅" : "❌"} ${task.name} (${result.duration}ms)`,
      );

      // Display detailed errors for failed tasks
      if (!result.success) {
        if (
          task.name === "test" &&
          result.testResult &&
          result.testResult.failures.length > 0
        ) {
          this.displayTestFailures(result.testResult);
        } else if (task.name === "lint") {
          this.displayLintErrors(result.output);
        } else if (task.name === "typecheck") {
          this.displayTypecheckErrors(result.output);
        }
      }

      // Display test failures if any (even for successful runs with warnings)
      if (result.testResult && result.testResult.failures.length > 0) {
        this.displayTestFailures(result.testResult);
      }
    } catch (error) {
      const result = { success: false, output: error.message, duration: 0 };
      this.results.set(task.name, result);
      monitor.endTask(task.name, false, error.message);
      console.log(`❌ ${task.name} (failed)`);
    }
  }

  private async runCommand(task: Task): Promise<{
    success: boolean;
    output: string;
    duration: number;
    testResult?: TestResult;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn(task.command[0], task.command.slice(1), {
        cwd: task.cwd || process.cwd(),
        env: { ...process.env, ...task.env },
        stdio: ["inherit", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      child.stdout?.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        // Show output in real-time for better feedback
        if (task.name !== "test") {
          process.stdout.write(chunk);
        }
      });

      child.stderr?.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        // Show errors in real-time for better feedback
        if (task.name !== "test") {
          process.stderr.write(chunk);
        }
      });

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        const fullOutput = output + errorOutput;
        resolve({ success, output: fullOutput, duration });
      });

      child.on("error", (error) => {
        const duration = Date.now() - startTime;
        resolve({ success: false, output: error.message, duration });
      });
    });
  }

  private displayTestFailures(testResult: TestResult): void {
    console.log(
      `\n❌ Test Failures (${testResult.failed}/${testResult.total}):`,
    );
    console.log("─".repeat(60));

    for (const failure of testResult.failures) {
      console.log(`\n🔴 ${failure.testName}`);
      console.log(`   📁 ${failure.filePath}`);

      if (failure.errorMessage) {
        console.log(`   💥 Error: ${failure.errorMessage}`);
      }

      if (failure.stackTrace) {
        console.log(`   📋 Stack Trace:`);
        const stackLines = failure.stackTrace.split("\n");
        for (const line of stackLines.slice(0, 10)) {
          // Limit stack trace lines
          if (line.trim()) {
            console.log(`      ${line}`);
          }
        }
        if (stackLines.length > 10) {
          console.log(`      ... (${stackLines.length - 10} more lines)`);
        }
      }

      console.log("─".repeat(40));
    }

    console.log(
      `\n📊 Summary: ${testResult.passed} passed, ${testResult.failed} failed\n`,
    );
  }

  private displayLintErrors(output: string): void {
    console.log(`\n❌ Lint Errors/Warnings:`);
    console.log("─".repeat(60));

    const lines = output.split("\n");
    for (const line of lines) {
      if (line.trim() && (line.includes("error") || line.includes("warning"))) {
        console.log(`   ${line}`);
      }
    }
    console.log("");
  }

  private displayTypecheckErrors(output: string): void {
    console.log(`\n❌ Type Check Errors:`);
    console.log("─".repeat(60));

    const lines = output.split("\n");
    let currentError: string[] = [];
    let collectingError = false;

    for (const line of lines) {
      if (line.includes("error TS")) {
        if (currentError.length > 0) {
          console.log(`   ${currentError.join("\n   ")}`);
          console.log("");
        }
        currentError = [line.trim()];
        collectingError = true;
      } else if (collectingError && line.trim()) {
        currentError.push(line.trim());
      } else if (collectingError && !line.trim()) {
        if (currentError.length > 0) {
          console.log(`   ${currentError.join("\n   ")}`);
          console.log("");
        }
        currentError = [];
        collectingError = false;
      }
    }

    // Print last error if exists
    if (currentError.length > 0) {
      console.log(`   ${currentError.join("\n   ")}`);
      console.log("");
    }
  }

  getResults() {
    return this.results;
  }
}

// Main execution
async function main() {
  console.log("🚀 High-Performance Check Starting...\n");

  const monitor = new PerformanceMonitor();
  const cacheManager = new CacheManager();
  const changeDetector = new ChangeDetector();
  const taskExecutor = new TaskExecutor();

  try {
    // Initialize cache
    await cacheManager.loadCache();

    // Detect changes
    const changedFiles = await changeDetector.getChangedFiles();
    console.log(`📁 Detected ${changedFiles.length} changed files`);

    if (changedFiles.length === 0) {
      console.log("✅ No changes detected, skipping checks");
      return 0;
    }

    // Execute tasks in parallel
    const tasks = Object.values(TASKS);
    const success = await taskExecutor.executeTasks(
      tasks,
      changedFiles,
      cacheManager,
      monitor,
    );

    // Save cache and metrics
    await cacheManager.saveCache();
    await monitor.saveMetrics();

    // Display results
    const metrics = monitor.getMetrics();
    console.log(`\n📊 Performance Summary:`);
    console.log(`   Total time: ${metrics.totalDuration}ms`);
    console.log(`   Tasks completed: ${Object.keys(metrics.tasks).length}`);

    // Display individual task results
    console.log(`\n📋 Task Results:`);
    for (const [taskName, taskMetrics] of Object.entries(metrics.tasks)) {
      const status = taskMetrics.success ? "✅" : "❌";
      console.log(`   ${status} ${taskName}: ${taskMetrics.duration}ms`);

      // Show test failure summary if applicable
      const taskResult = taskExecutor.getResults().get(taskName);
      if (taskResult?.testResult && taskResult.testResult.failures.length > 0) {
        const testResult = taskResult.testResult;
        console.log(
          `      📊 Tests: ${testResult.passed} passed, ${testResult.failed} failed`,
        );
      }
    }

    return success ? 0 : 1;
  } catch (error) {
    console.error("❌ High-performance check failed:", error);
    await monitor.saveMetrics();
    return 1;
  }
}

// Run the script
if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch(() => process.exit(1));
}

export { PerformanceMonitor, CacheManager, ChangeDetector, TaskExecutor };
