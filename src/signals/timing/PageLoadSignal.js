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
    
    // Calculate key timings.
    // A 0 entry means the event hasn't fired; subtracting from a large epoch
    // timestamp produces a huge negative number that was incorrectly flagged
    // as 'negative-timing' (timestamp manipulation).
    const navigationStart = timing.navigationStart;
    const safeTimingDiff = (end, start) => {
      if (end === 0 || start === 0) return null;
      return end - start;
    };

    const domContentLoaded = safeTimingDiff(timing.domContentLoadedEventEnd, navigationStart);
    const domComplete = safeTimingDiff(timing.domComplete, navigationStart);
    const loadComplete = safeTimingDiff(timing.loadEventEnd, navigationStart);
    const dnsLookup = safeTimingDiff(timing.domainLookupEnd, timing.domainLookupStart);
    const tcpConnection = safeTimingDiff(timing.connectEnd, timing.connectStart);
    const serverResponse = safeTimingDiff(timing.responseEnd, timing.requestStart);
    const domProcessing = safeTimingDiff(timing.domComplete, timing.domLoading);

    // Check for impossibly fast load times
    if (domContentLoaded !== null && domContentLoaded > 0 && domContentLoaded < 10) {
      anomalies.push('instant-dom-content-loaded');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for zero DNS lookup (could indicate local file or caching, but suspicious in combination)
    if (dnsLookup === 0 && tcpConnection === 0 && serverResponse !== null && serverResponse < 5) {
      anomalies.push('zero-network-timing');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for negative timings (timestamp manipulation).
    if ((domContentLoaded !== null && domContentLoaded < 0) ||
        (domComplete !== null && domComplete < 0) ||
        (loadComplete !== null && loadComplete < 0)) {
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
    if (domProcessing !== null && domProcessing > 30000) { // 30 seconds
      anomalies.push('excessive-dom-processing');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for script injection timing pattern
    // Bots often inject scripts immediately after load
    const scriptsLoadedTime = timing.domContentLoadedEventStart - timing.responseEnd;
    if (timing.responseEnd > 0 && timing.domContentLoadedEventStart > 0 &&
        scriptsLoadedTime > 0 && scriptsLoadedTime < 5) {
      anomalies.push('instant-script-execution');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for performance.now() manipulation.
    // performance.now() to 1-2ms for Spectre protection. Two consecutive calls
    // can legitimately return the same value, so comparing only two is unreliable.
    // Instead, use a busy-wait loop to advance time, then check if the clock moved.
    const perfBefore = performance.now();
    // Spin for ~1ms to force the clock to advance past quantization granularity
    const spinEnd = perfBefore + 2;
    // eslint-disable-next-line no-empty
    while (performance.now() < spinEnd) {}
    const perfAfter = performance.now();

    if (perfAfter === perfBefore) {
      // Clock truly didn't advance over 2ms — something is wrong
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
