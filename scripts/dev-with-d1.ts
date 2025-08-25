import { spawn } from 'child_process';
import { injectDatabaseBindings } from '~/server/db';

async function main() {
  // This is a placeholder for how you might get the D1 binding.
  // In a real-world scenario, you would get this from the Cloudflare Workers runtime.
  // For local development, we can simulate this by creating a mock D1 binding.
  const getD1Binding = () => {
    // This is a mock D1 binding. In a real scenario, this would be provided by the Cloudflare runtime.
    return {
      prepare: () => ({
        all: () => Promise.resolve({ results: [], success: true, meta: {} }),
        first: () => Promise.resolve(null),
        run: () => Promise.resolve({ success: true, meta: { changes: 1, last_row_id: 1 } }),
        raw: () => Promise.resolve([]),
        bind: () => this,
      }),
      exec: () => Promise.resolve({ results: [], success: true, meta: {} }),
      batch: () => Promise.resolve([]),
      dump: () => Promise.resolve(new ArrayBuffer(0)),
    } as any;
  };

  const d1Binding = getD1Binding();

  // Inject the D1 binding into the application's runtime.
  injectDatabaseBindings({ DB: d1Binding });

  // Start the development server.
  const devServer = spawn('bun', ['run', 'dev'], {
    stdio: 'inherit',
  });

  devServer.on('close', (code) => {
    console.log(`Development server exited with code ${code}`);
  });
}

main().catch((error) => {
  console.error('Failed to start development server with D1 binding:', error);
  process.exit(1);
});
