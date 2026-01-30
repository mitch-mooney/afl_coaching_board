import { beforeEach, vi } from 'vitest';

// Mock IndexedDB for Dexie
import 'fake-indexeddb/auto';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock HTMLVideoElement methods that aren't available in jsdom
Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window.HTMLVideoElement.prototype, 'load', {
  configurable: true,
  value: vi.fn(),
});
