/**
 * @fileoverview Analyzes DOM content loaded event timing.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Analyzes timing around DOMContentLoaded event.
 * Bots may have unusual patterns in when/how DOM is processed.
 */
class DOMContentTimingSignal extends Signal {
  static id = 'dom-content-timing';
  static category = 'timing';
  static weight = 0.4;
  static description = 'Analyzes DOM content loaded timing patterns';

  constructor(options = {}) {
    super(options);
    this._domContentLoadedTime = null;
    this._documentReadyState = document.readyState;
    this._captureTime = performance.now();
    
    // Capture DOMContentLoaded time if not already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this._domContentLoadedTime = performance.now();
      });
    }
  }

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Get timing information
    const now = performance.now();
    const readyState = document.readyState;
    
    // Check resource timing
    let resourceCount = 0;
    let totalResourceTime = 0;
    let externalScriptCount = 0;

    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      resourceCount = resources.length;

      for (const resource of resources) {
        totalResourceTime += resource.duration;
        if (resource.initiatorType === 'script' && 
            resource.name.startsWith('http')) {
          externalScriptCount++;
        }
      }
    }

    // Check for very few resources (headless often loads minimal)
    if (resourceCount === 0 && readyState === 'complete') {
      anomalies.push('no-resources-loaded');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for suspiciously fast DOM ready without resources
    if (this._domContentLoadedTime && this._domContentLoadedTime < 50 && resourceCount === 0) {
      anomalies.push('instant-ready-no-resources');
      confidence = Math.max(confidence, 0.6);
    }

    // Check document.hidden state at load
    // Bots often run in hidden/background state
    if (document.hidden && this._documentReadyState === 'loading') {
      anomalies.push('hidden-at-load');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for visibility API
    if (typeof document.visibilityState === 'undefined') {
      anomalies.push('no-visibility-api');
      confidence = Math.max(confidence, 0.4);
    }

    // Check DOM manipulation timing
    try {
      const startMutation = performance.now();
      const testDiv = document.createElement('div');
      testDiv.id = '__bot_detection_test__';
      document.body.appendChild(testDiv);
      const afterAppend = performance.now();
      document.body.removeChild(testDiv);
      const afterRemove = performance.now();

      const appendTime = afterAppend - startMutation;
      const removeTime = afterRemove - afterAppend;

      // Instant DOM operations (< 0.01ms) may indicate mocked DOM
      if (appendTime === 0 && removeTime === 0) {
        anomalies.push('instant-dom-operations');
        confidence = Math.max(confidence, 0.5);
      }
    } catch (e) {
      // If body doesn't exist yet, that's unusual at detection time
      if (!document.body) {
        anomalies.push('no-document-body');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check for MutationObserver availability (should exist in modern browsers)
    if (typeof MutationObserver === 'undefined') {
      anomalies.push('no-mutation-observer');
      confidence = Math.max(confidence, 0.5);
    }

    // Check for requestAnimationFrame availability
    if (typeof requestAnimationFrame === 'undefined') {
      anomalies.push('no-request-animation-frame');
      confidence = Math.max(confidence, 0.5);
    }

    // Check timing of first paint if available
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(e => e.name === 'first-paint');
      
      if (!firstPaint && readyState === 'complete' && now > 1000) {
        anomalies.push('no-first-paint');
        confidence = Math.max(confidence, 0.4);
      }

      // Check for first contentful paint
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
      if (!fcp && readyState === 'complete' && now > 1000) {
        anomalies.push('no-first-contentful-paint');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check intersection observer
    if (typeof IntersectionObserver === 'undefined') {
      anomalies.push('no-intersection-observer');
      confidence = Math.max(confidence, 0.4);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      metrics: {
        readyState,
        resourceCount,
        externalScriptCount,
        domContentLoadedTime: this._domContentLoadedTime,
        documentHidden: document.hidden,
      },
    }, confidence);
  }
}

export { DOMContentTimingSignal };
