/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Event listener tracking type defined inline

/**
 * Memory management utilities for tracking and cleaning up event listeners and timeouts
 * Prevents memory leaks by maintaining references to all registered listeners and timeouts
 */
const MemoryManager = {
  listeners: [] as Array<{
    el: HTMLElement | Window | Document;
    type: string;
    handler: EventListenerOrEventListenerObject;
  }>,
  timeouts: [] as number[],

  /**
   * Register an event listener and track it for cleanup
   * @param el - The element to attach the listener to
   * @param type - The event type (e.g., 'click', 'change')
   * @param handler - The event handler function
   */
  registerEventListener: function (
    el: HTMLElement | Window | Document,
    type: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    el.addEventListener(type, handler);
    this.listeners.push({ el, type, handler });
  },

  /**
   * Register a timeout ID for cleanup
   * @param id - The timeout ID returned by setTimeout
   */
  registerTimeout: function (id: number): void {
    this.timeouts.push(id);
  },

  /**
   * Clean up all registered event listeners and timeouts
   * Should be called before page unload or when resetting the application
   */
  cleanup: function (): void {
    // Remove all event listeners
    this.listeners.forEach(({ el, type, handler }) => {
      el.removeEventListener(type, handler);
    });

    // Clear all timeouts
    this.timeouts.forEach((id) => clearTimeout(id));

    // Reset the arrays
    this.listeners = [];
    this.timeouts = [];

    console.log('Cleanup performed (simplified)');
  },
};

// Automatically cleanup before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => MemoryManager.cleanup());
}

export default MemoryManager;
