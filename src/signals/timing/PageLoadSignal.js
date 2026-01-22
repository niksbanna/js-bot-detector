/**
 * @fileoverview Detects suspicious page load timing patterns.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Analyzes page load timing for automation indicators.
 * Bots often have unusual or suspiciously fast load patterns.
 */
class PageLoadSignal extends Signal {
  static id = 'page-load';
  static category = 'timing';
  static weight = 0.5;
  static description = 'Detects suspicious page load timing';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Check if Performance API is available
    if (!window.performance || !performance.timing) {
      // Try Navigation Timing API Level 2
      if (performance.getEntriesByType) {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          return this._analyzeNavigationTiming(navEntries[0]);
        }
      }
      
      anomalies.push('no-performance-api');
      confidence = Math.max(confidence, 0.3);
      return this.createResult(true, { anomalies }, confidence);
    }

    const timing = performance.timing;
    
    // Calculate key timings
    const navigationStart = timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;
    const domComplete = timing.domComplete - navigationStart;
    const loadComplete = timing.loadEventEnd - navigationStart;
    const dnsLookup = timing.domainLookupEnd - timing.domainLookupStart;
    const tcpConnection = timing.connectEnd - timing.connectStart;
    const serverResponse = timing.responseEnd - timing.requestStart;
    const domProcessing = timing.domComplete - timing.domLoading;

    // Check for impossibly fast load times
    if (domContentLoaded > 0 && domContentLoaded < 10) {
      anomalies.push('instant-dom-content-loaded');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for zero DNS lookup (could indicate local file or caching, but suspicious in combination)
    if (dnsLookup === 0 && tcpConnection === 0 && serverResponse < 5) {
      anomalies.push('zero-network-timing');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for negative timings (timestamp manipulation)
    if (domContentLoaded < 0 || domComplete < 0 || loadComplete < 0) {
      anomalies.push('negative-timing');
      confidence = Math.max(confidence, 0.8);
    }

    // Check for unrealistic timing order
    if (timing.domContentLoadedEventEnd > 0 && timing.loadEventEnd > 0) {
      if (timing.domContentLoadedEventEnd > timing.loadEventEnd) {
        anomalies.push('timing-order-violation');
        confidence = Math.max(confidence, 0.7);
      }
    }

    // Check for very long processing times (could indicate headless waiting)
    if (domProcessing > 30000) { // 30 seconds
      anomalies.push('excessive-dom-processing');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for script injection timing pattern
    // Bots often inject scripts immediately after load
    const scriptsLoadedTime = timing.domContentLoadedEventStart - timing.responseEnd;
    if (scriptsLoadedTime > 0 && scriptsLoadedTime < 5) {
      anomalies.push('instant-script-execution');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for performance.now() manipulation
    const perfNow1 = performance.now();
    const perfNow2 = performance.now();
    
    // If two consecutive calls return the same value (shouldn't happen)
    if (perfNow1 === perfNow2 && perfNow1 > 0) {
      anomalies.push('frozen-performance-now');
      confidence = Math.max(confidence, 0.6);
    }

    // Check for Date.now() vs performance.now() consistency
    const dateNow1 = Date.now();
    const perfNow3 = performance.now();
    const dateNow2 = Date.now();
    
    // If they're wildly inconsistent
    if (Math.abs((dateNow2 - dateNow1) - (performance.now() - perfNow3)) > 100) {
      anomalies.push('timing-inconsistency');
      confidence = Math.max(confidence, 0.5);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      timings: {
        domContentLoaded,
        domComplete,
        loadComplete,
        dnsLookup,
        tcpConnection,
        serverResponse,
        domProcessing,
      },
    }, confidence);
  }

  /**
   * Analyze Navigation Timing Level 2 API data.
   * @param {PerformanceNavigationTiming} entry - Navigation timing entry
   * @returns {SignalResult}
   */
  _analyzeNavigationTiming(entry) {
    const anomalies = [];
    let confidence = 0;

    const domContentLoaded = entry.domContentLoadedEventEnd;
    const loadComplete = entry.loadEventEnd;
    const dnsLookup = entry.domainLookupEnd - entry.domainLookupStart;
    const serverResponse = entry.responseEnd - entry.requestStart;

    // Check for impossibly fast load
    if (domContentLoaded > 0 && domContentLoaded < 10) {
      anomalies.push('instant-dom-content-loaded');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for zero timings
    if (dnsLookup === 0 && serverResponse === 0) {
      anomalies.push('zero-network-timing');
      confidence = Math.max(confidence, 0.4);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      timings: {
        domContentLoaded,
        loadComplete,
        dnsLookup,
        serverResponse,
      },
    }, confidence);
  }
}

export { PageLoadSignal };
