/**
 * Vitest Test Setup
 *
 * Configures the test environment with jsdom and provides common utilities.
 */

import '@testing-library/dom';

// Ensure clean state between tests
beforeEach(() => {
  // Clear any existing event listeners on window
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  // Track event listeners for cleanup verification
  const listeners: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject;
  }> = [];

  window.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    listeners.push({ type, listener });
    return originalAddEventListener.call(this, type, listener, options);
  };

  window.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    const index = listeners.findIndex(
      (l) => l.type === type && l.listener === listener
    );
    if (index >= 0) {
      listeners.splice(index, 1);
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };
});

afterEach(() => {
  // Clean up the DOM
  document.body.innerHTML = '';
});
