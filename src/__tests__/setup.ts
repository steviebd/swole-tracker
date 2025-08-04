import '@testing-library/jest-dom';

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// JSDOM cleanup after each test
afterEach(() => {
  cleanup();
});

// Provide minimal browser globals as needed
// (Adjust/migrate if specific hooks need more shims)
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(), // deprecated but some libs still call
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));
