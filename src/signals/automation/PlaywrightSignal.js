/**
 * @fileoverview Detects Playwright-specific artifacts.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects artifacts left by Playwright automation.
 * Playwright injects specific objects and leaves traces.
 */
class PlaywrightSignal extends Signal {
  static id = 'playwright';
  static category = 'automation';
  static weight = 1.0;
  static description = 'Detects Playwright automation artifacts';

  async detect() {
    const indicators = [];
    let confidence = 0;

    // Check for Playwright namespace
    if (window.__playwright) {
      indicators.push('playwright-namespace');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for Playwright-injected objects
    const playwrightGlobals = [
      '__playwright',
      '__pw_manual',
      '__pwInitScripts',
      'playwright',
    ];

    for (const global of playwrightGlobals) {
      if (global in window) {
        indicators.push(`global-${global}`);
        confidence = Math.max(confidence, 1.0);
      }
    }

    // Check for Playwright's binding pattern
    if (window.__playwright__binding__) {
      indicators.push('playwright-binding');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for Playwright-specific user agent markers
    const ua = navigator.userAgent || '';
    if (ua.includes('Playwright') || ua.includes('HeadlessChrome')) {
      indicators.push('playwright-ua-marker');
      confidence = Math.max(confidence, ua.includes('Playwright') ? 1.0 : 0.7);
    }

    // Check for Playwright's evaluate scope pattern
    try {
      // Playwright injects __pwBinding__ functions
      const windowKeys = Object.keys(window);
      const pwBindings = windowKeys.filter(k => k.startsWith('__pw'));
      
      if (pwBindings.length > 0) {
        indicators.push('pw-bindings');
        confidence = Math.max(confidence, 1.0);
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for Playwright's typical initialization patterns
    if (typeof window.__pw_date_intercepted !== 'undefined') {
      indicators.push('date-interception');
      confidence = Math.max(confidence, 0.9);
    }

    // Check for Playwright's geolocation mock
    if (window.__pw_geolocation__) {
      indicators.push('geolocation-mock');
      confidence = Math.max(confidence, 0.9);
    }

    // Check for Playwright's permission override
    if (window.__pw_permissions__) {
      indicators.push('permissions-override');
      confidence = Math.max(confidence, 0.9);
    }

    // Check CDP session artifacts
    if (window.__cdpSession__) {
      indicators.push('cdp-session');
      confidence = Math.max(confidence, 0.8);
    }

    // Check for error stack traces containing Playwright
    try {
      throw new Error('stack trace test');
    } catch (e) {
      const stack = e.stack || '';
      if (stack.includes('playwright') || stack.includes('__pw')) {
        indicators.push('stack-trace-playwright');
        confidence = Math.max(confidence, 0.8);
      }
    }

    // Check for Playwright's locale/timezone mocking
    try {
      const date = new Date();
      const localeString = date.toLocaleString();
      // Playwright often mocks timezone
      if (window.__pwTimezone__) {
        indicators.push('timezone-mock');
        confidence = Math.max(confidence, 0.8);
      }
    } catch (e) {
      // Ignore errors
    }

    const triggered = indicators.length > 0;

    return this.createResult(triggered, { indicators }, confidence);
  }
}

export { PlaywrightSignal };
