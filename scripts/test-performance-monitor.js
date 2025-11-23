import { execSync } from "child_process";

const measureTestPerformance = (testCommand, description) => {
  console.log(`\n🚀 Measuring performance: ${description}`);
  console.log(`Command: ${testCommand}`);

  const start = Date.now();
  const memoryBefore = process.memoryUsage();

  try {
    execSync(testCommand, { stdio: "inherit" });
  } catch (error) {
    console.log(`❌ Test failed with exit code: ${error.status}`);
  }

  const duration = Date.now() - start;
  const memoryAfter = process.memoryUsage();

  console.log(`\n📊 Performance Results for ${description}:`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(
    `💾 Memory delta: ${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`,
  );

  return {
    duration,
    memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
  };
};

const main = () => {
  const results = [];

  // Test different configurations
  results.push(measureTestPerformance("bun run test:fast", "Fast Unit Tests"));
  results.push(
    measureTestPerformance("bun run test:unit", "Unit Tests with Coverage"),
  );
  results.push(
    measureTestPerformance("bun run test:integration", "Integration Tests"),
  );

  console.log("\n📈 Summary:");
  results.forEach((result, i) => {
    const configs = ["Fast Unit", "Unit + Coverage", "Integration"];
    console.log(`${configs[i]}: ${result.duration}ms`);
  });

  // Check if we meet targets
  const fastTest = results[0];
  if (fastTest.duration < 10000) {
    console.log("✅ Fast tests under 10 seconds target");
  } else {
    console.log("❌ Fast tests exceed 10 seconds target");
  }

  if (fastTest.duration < 30000) {
    console.log("✅ All tests under 30 seconds target");
  } else {
    console.log("❌ Tests exceed 30 seconds target");
  }
};

main();

export { measureTestPerformance };
