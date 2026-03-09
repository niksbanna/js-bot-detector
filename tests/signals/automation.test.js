import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PuppeteerSignal } from '../../src/signals/automation/PuppeteerSignal.js';

describe('PuppeteerSignal', () => {
  it('should have correct metadata', () => {
    const signal = new PuppeteerSignal();
    expect(signal.id).toBe('puppeteer');
    expect(signal.category).toBe('automation');
    expect(signal.weight).toBe(1.0);
  });

  it('should run detection without errors', async () => {
    const signal = new PuppeteerSignal();
    const result = await signal.run();

    expect(result).toHaveProperty('triggered');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('value');
  });

  // window.chrome.runtime is only populated inside Chrome extensions.
  // Its absence is completely normal for all real Chrome users — the check
  // was causing every non-extension Chrome browser to be flagged as Puppeteer.
  describe('incomplete-chrome-object — false-positive regression', () => {
    it('should NOT flag when window.chrome.runtime exists (normal Chrome with extension)', async () => {
      const originalChrome = window.chrome;
      try {
        Object.defineProperty(window, 'chrome', {
          value: { runtime: { id: undefined } },
          configurable: true,
          writable: true,
        });

        const signal = new PuppeteerSignal();
        const result = await signal.run();

        expect(result.value?.indicators ?? []).not.toContain('incomplete-chrome-object');
      } finally {
        if (originalChrome === undefined) {
          delete window.chrome;
        } else {
          Object.defineProperty(window, 'chrome', {
            value: originalChrome,
            configurable: true,
            writable: true,
          });
        }
      }
    });

    it('should NOT flag when window.chrome.runtime is absent (normal Chrome without extensions)', async () => {
      // This was the false-positive case: chrome object exists but runtime is absent.
      // Previously flagged as bot; now correctly ignored.
      const originalChrome = window.chrome;
      try {
        Object.defineProperty(window, 'chrome', {
          value: {},  // chrome exists but runtime is absent — normal real user
          configurable: true,
          writable: true,
        });

        const signal = new PuppeteerSignal();
        const result = await signal.run();

        // Must NOT flag — this is a real Chrome user without any extension
        expect(result.value?.indicators ?? []).not.toContain('incomplete-chrome-object');
      } finally {
        if (originalChrome === undefined) {
          delete window.chrome;
        } else {
          Object.defineProperty(window, 'chrome', {
            value: originalChrome,
            configurable: true,
            writable: true,
          });
        }
      }
    });
  });

  describe('suspicious-bindings — false-positive regression', () => {
    it('should NOT flag __zone_symbol__ functions added by Angular Zone.js', async () => {
      // Simulate Angular Zone.js patching window with __zone_symbol__* functions
      const zoneKeys = [
        '__zone_symbol__setTimeout',
        '__zone_symbol__clearTimeout',
        '__zone_symbol__setInterval',
        '__zone_symbol__clearInterval',
        '__zone_symbol__requestAnimationFrame',
        '__zone_symbol__cancelAnimationFrame',
      ];
      for (const key of zoneKeys) {
        window[key] = function () {};
      }

      try {
        const signal = new PuppeteerSignal();
        const result = await signal.run();

        expect(result.value?.indicators ?? []).not.toContain('suspicious-bindings');
      } finally {
        for (const key of zoneKeys) {
          delete window[key];
        }
      }
    });

    it('should flag when more than 10 non-zone/framework suspicious __ bindings exist', async () => {
      // from Next.js, webpack, React DevTools, Vite etc.
      const fakeBindings = [
        '__binding_0__',
        '__binding_1__',
        '__binding_2__',
        '__binding_3__',
        '__binding_4__',
        '__binding_5__',
        '__binding_6__',
        '__binding_7__',
        '__binding_8__',
        '__binding_9__',
        '__binding_10__',
        '__binding_11__',
      ];
      for (const key of fakeBindings) {
        window[key] = function () {};
      }

      try {
        const signal = new PuppeteerSignal();
        const result = await signal.run();

        expect(result.value?.indicators ?? []).toContain('suspicious-bindings');
      } finally {
        for (const key of fakeBindings) {
          delete window[key];
        }
      }
    });
  });
});
