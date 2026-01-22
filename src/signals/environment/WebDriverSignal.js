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

    // Check if property exists but is hidden/modified
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    if (descriptor) {
      // Property exists - check if it's been tampered with
      if (descriptor.get || !descriptor.configurable) {
        return this.createResult(true, { 
          webdriver: 'modified',
          descriptor: {
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            hasGetter: !!descriptor.get,
          }
        }, 0.8);
      }
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
