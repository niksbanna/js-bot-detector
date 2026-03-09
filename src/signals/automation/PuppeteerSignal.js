/**
 * @fileoverview Detects Puppeteer-specific artifacts.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects artifacts left by Puppeteer automation.
 * Puppeteer leaves various fingerprints in the browser context.
 */
class PuppeteerSignal extends Signal {
  static id = 'puppeteer';
  static category = 'automation';
  static weight = 1.0;
  static description = 'Detects Puppeteer automation artifacts';

  async detect() {
    const indicators = [];
    let confidence = 0;

    // Check for Puppeteer evaluation script marker
    if (window.__puppeteer_evaluation_script__) {
      indicators.push('puppeteer-evaluation-script');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for Puppeteer-injected functions
    const puppeteerGlobals = [
      '__puppeteer_evaluation_script__',
      '__puppeteer',
      'puppeteer',
    ];

    for (const global of puppeteerGlobals) {
      if (global in window) {
        indicators.push(`global-${global}`);
        confidence = Math.max(confidence, 1.0);
      }
    }

    // Check for HeadlessChrome in user agent (common with Puppeteer)
    const ua = navigator.userAgent || '';
    if (ua.includes('HeadlessChrome')) {
      indicators.push('headless-chrome-ua');
      confidence = Math.max(confidence, 0.9);
    }

    // Check for Puppeteer's typical Chrome DevTools Protocol artifacts
    if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array ||
        window.cdc_adoQpoasnfa76pfcZLmcfl_Promise ||
        window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol) {
      indicators.push('cdp-artifacts');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for DevTools protocol detection
    try {
      // Puppeteer often leaves eval traces
      const evalTest = window.eval.toString();
      if (evalTest.includes('puppeteer')) {
        indicators.push('eval-puppeteer');
        confidence = Math.max(confidence, 0.9);
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for typical Puppeteer page.evaluate patterns in stack traces
    try {
      throw new Error('stack trace test');
    } catch (e) {
      const stack = e.stack || '';
      if (stack.includes('puppeteer') || stack.includes('pptr')) {
        indicators.push('stack-trace-puppeteer');
        confidence = Math.max(confidence, 0.8);
      }
    }

    // Check for Puppeteer's default viewport (800x600)
    if (window.innerWidth === 800 && window.innerHeight === 600) {
      // Only weak indicator - could be coincidence
      indicators.push('default-viewport');
      confidence = Math.max(confidence, 0.3);
    }

    // navigator.webdriver is already exclusively checked by WebDriverSignal (environment).
    // Duplicating it here causes triple-counting of the same property across signals.

    // Check for binding injection pattern
    // Puppeteer's exposeFunction creates window bindings
    // (Next.js, webpack, React DevTools, Angular) push __* count past the
    // old threshold of 5 on perfectly normal pages.
    const FRAMEWORK_PREFIXES = [
      '__zone_symbol__',   // Angular / Zone.js
      '__next',            // Next.js
      '__webpack',         // webpack
      '__react',           // React DevTools
      '__REACT',
      '__vite',            // Vite
      '__nuxt',            // Nuxt.js
    ];
    const suspiciousBindings = Object.keys(window).filter(key => {
      if (!key.startsWith('__')) return false;
      if (typeof window[key] !== 'function') return false;
      return !FRAMEWORK_PREFIXES.some(prefix => key.startsWith(prefix));
    });

    if (suspiciousBindings.length > 10) {
      indicators.push('suspicious-bindings');
      confidence = Math.max(confidence, 0.5);
    }

    // window.chrome.runtime is ONLY populated inside Chrome extensions.
    // Its absence is completely normal for all real Chrome users.
    // This check was causing every non-extension Chrome user to be flagged as Puppeteer.

    const triggered = indicators.length > 0;

    return this.createResult(triggered, { indicators }, confidence);
  }
}

export { PuppeteerSignal };
