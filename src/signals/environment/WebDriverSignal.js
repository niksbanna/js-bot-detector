/**
 * @fileoverview Detects navigator.webdriver property.
 * This is the most reliable indicator of WebDriver-controlled browsers.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects the presence of navigator.webdriver property.
 * This property is set to true by automation frameworks like Selenium, Puppeteer, and Playwright.
 */
class WebDriverSignal extends Signal {
  static id = 'webdriver';
  static category = 'environment';
  static weight = 1.0;
  static description = 'Detects navigator.webdriver automation flag';

  async detect() {
    // Direct check
    if (navigator.webdriver === true) {
      return this.createResult(true, { webdriver: true }, 1.0);
    }

    // Check for an own property on the navigator instance (not on the prototype).
    // This only exists when a script has explicitly defined or overridden webdriver
    // on the instance itself (e.g. stealth plugins, CDP patches).
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    if (descriptor) {
      if (descriptor.get) {
        // Own getter found — invoke it to read the actual value.
        // A native browser getter here would be unusual; we check toString to distinguish.
        try {
          const val = descriptor.get.call(navigator);
          if (val === true) {
            return this.createResult(true, { webdriver: true, source: 'own-getter' }, 1.0);
          }
          // Getter returns non-true but is not native code →
          // a stealth plugin is actively hiding navigator.webdriver.
          if (!descriptor.get.toString().includes('[native code]')) {
            return this.createResult(true, {
              webdriver: 'hidden',
              descriptor: { configurable: descriptor.configurable },
            }, 0.8);
          }
        } catch (e) {
          // ignore — treat as not triggered
        }
      } else if (descriptor.value === true) {
        // Plain data property explicitly set to true.
        return this.createResult(true, { webdriver: true, source: 'own-property' }, 1.0);
      }
      // Non-configurable own property whose value is not true is not suspicious on its own.
    }

    // Check prototype chain for webdriver
    try {
      const proto = Object.getPrototypeOf(navigator);
      const protoDescriptor = Object.getOwnPropertyDescriptor(proto, 'webdriver');
      if (protoDescriptor && protoDescriptor.get) {
        const value = protoDescriptor.get.call(navigator);
        if (value === true) {
          return this.createResult(true, { webdriver: true, source: 'prototype' }, 1.0);
        }
      }
    } catch (e) {
      // Some environments may throw on prototype access
    }

    return this.createResult(false);
  }
}

export { WebDriverSignal };
