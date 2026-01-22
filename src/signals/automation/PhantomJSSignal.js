/**
 * @fileoverview Detects PhantomJS-specific artifacts.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects artifacts left by PhantomJS.
 * PhantomJS is an older headless browser that leaves specific traces.
 */
class PhantomJSSignal extends Signal {
  static id = 'phantomjs';
  static category = 'automation';
  static weight = 1.0;
  static description = 'Detects PhantomJS automation artifacts';

  async detect() {
    const indicators = [];
    let confidence = 0;

    // Check for PhantomJS globals
    if (window.callPhantom) {
      indicators.push('callPhantom');
      confidence = Math.max(confidence, 1.0);
    }

    if (window._phantom) {
      indicators.push('_phantom');
      confidence = Math.max(confidence, 1.0);
    }

    if (window.phantom) {
      indicators.push('phantom');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for PhantomJS in user agent
    const ua = navigator.userAgent || '';
    if (ua.includes('PhantomJS')) {
      indicators.push('phantomjs-ua');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for PhantomJS specific properties
    if (window.__phantomas) {
      indicators.push('phantomas');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for CasperJS (built on PhantomJS)
    if (window.__casper) {
      indicators.push('casperjs');
      confidence = Math.max(confidence, 1.0);
    }

    if (window.casper) {
      indicators.push('casper-global');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for SlimerJS (PhantomJS alternative)
    if (window.slimer) {
      indicators.push('slimerjs');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for NightmareJS (Electron-based, similar patterns)
    if (window.__nightmare) {
      indicators.push('nightmare');
      confidence = Math.max(confidence, 1.0);
    }

    if (window.nightmare) {
      indicators.push('nightmare-global');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for function sources containing PhantomJS
    try {
      const funcString = Function.prototype.toString.call(Function);
      if (funcString.includes('phantom') || funcString.includes('Phantom')) {
        indicators.push('function-prototype-phantom');
        confidence = Math.max(confidence, 0.8);
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for PhantomJS-specific behaviors
    // PhantomJS has a specific way of handling errors
    try {
      throw new Error('test');
    } catch (e) {
      const stack = e.stack || '';
      if (stack.includes('phantom')) {
        indicators.push('stack-trace-phantom');
        confidence = Math.max(confidence, 0.9);
      }
    }

    // Check for PhantomJS-specific plugin handling
    if (navigator.plugins && navigator.plugins.length === 0) {
      // Combined with other PhantomJS indicators
      if (indicators.length > 0) {
        indicators.push('no-plugins-phantom');
        confidence = Math.max(confidence, 0.5);
      }
    }

    // Check for specific PhantomJS window properties
    const phantomProps = [
      '__PHANTOM__',
      'PHANTOM',
      'Buffer', // PhantomJS exposes Node.js Buffer
      'process', // May expose Node.js process
    ];

    for (const prop of phantomProps) {
      if (prop in window && prop !== 'Buffer' && prop !== 'process') {
        indicators.push(`phantom-prop-${prop.toLowerCase()}`);
        confidence = Math.max(confidence, 0.9);
      }
    }

    // Check for QtWebKit (PhantomJS engine)
    if (ua.includes('QtWebKit')) {
      indicators.push('qtwebkit');
      confidence = Math.max(confidence, 0.7);
    }

    const triggered = indicators.length > 0;

    return this.createResult(triggered, { indicators }, confidence);
  }
}

export { PhantomJSSignal };
