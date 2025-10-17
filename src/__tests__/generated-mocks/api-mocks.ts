// Auto-generated API mocks
// Generated on 2025-10-16T03:15:50.035Z

import { vi } from 'vitest';

export const createAPIMock = (baseURL = 'http://localhost:3000') => ({
  get: vi.fn((url) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url },
  })),
  post: vi.fn((url, data) => Promise.resolve({
    data: null,
    status: 201,
    statusText: 'Created',
    headers: {},
    config: { url: baseURL + url, data },
  })),
  put: vi.fn((url, data) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url, data },
  })),
  delete: vi.fn((url) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url },
  })),
});
