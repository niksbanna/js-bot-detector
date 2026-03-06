/**
 * @fileoverview Detects headless browser indicators.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects indicators of headless browser execution.
 * Headless browsers often have missing or inconsistent features.
 */
class HeadlessSignal extends Signal {
  static id = 'headless';
  static category = 'environment';
  static weight = 0.8;
  static description = 'Detects headless browser indicators';

  async detect() {
    const indicators = [];
    let confidence = 0;

    // Check for HeadlessChrome in user agent
    const ua = navigator.userAgent || '';
    if (ua.includes('HeadlessChrome')) {
      indicators.push('headless-ua');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for missing chrome.runtime in Chrome
    if (ua.includes('Chrome') && !ua.includes('Chromium')) {
      if (typeof window.chrome === 'undefined') {
        indicators.push('missing-chrome-object');
        confidence = Math.max(confidence, 0.6);
      } else if (!window.chrome.runtime) {
        indicators.push('missing-chrome-runtime');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check for empty plugins (common in headless)
    if (navigator.plugins && navigator.plugins.length === 0) {
      indicators.push('no-plugins');
      confidence = Math.max(confidence, 0.5);
    }

    // Check for missing languages
    if (!navigator.languages || navigator.languages.length === 0) {
      indicators.push('no-languages');
      confidence = Math.max(confidence, 0.6);
    }

    // Check window dimensions anomalies
    if (window.outerWidth === 0 && window.outerHeight === 0) {
      indicators.push('zero-outer-dimensions');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for missing connection info
    if (typeof navigator.connection === 'undefined' && ua.includes('Chrome')) {
      indicators.push('missing-connection-api');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for Notification API permission inconsistency
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied' &&
          window.outerWidth === 0) {
        indicators.push('notification-headless-pattern');
        confidence = Math.max(confidence, 0.5);
      }
    } catch (_e) {
      // Ignore errors
    }

    // Phantom.js specific check
    if (window.callPhantom || window._phantom) {
      indicators.push('phantomjs');
      confidence = Math.max(confidence, 1.0);
    }

    // Nightmare.js check
    if (window.__nightmare) {
      indicators.push('nightmare');
      confidence = Math.max(confidence, 1.0);
    }

    const triggered = indicators.length > 0;
    
    // Increase confidence if multiple indicators are present
    if (indicators.length >= 3) {
      confidence = Math.min(1.0, confidence + 0.2);
    }

    return this.createResult(triggered, { indicators }, confidence);
  }
}

export { HeadlessSignal };
