/**
 * @fileoverview Detects navigator property anomalies and inconsistencies.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects inconsistencies in navigator properties.
 * Bots often have mismatched or spoofed navigator values.
 */
class NavigatorAnomalySignal extends Signal {
  static id = 'navigator-anomaly';
  static category = 'environment';
  static weight = 0.7;
  static description = 'Detects navigator property inconsistencies';

  async detect() {
    const anomalies = [];
    let totalScore = 0;
    let checksPerformed = 0;

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';

    // Platform vs UserAgent consistency check
    checksPerformed++;
    if (platform.includes('Win') && !ua.includes('Windows')) {
      anomalies.push('platform-ua-mismatch-windows');
      totalScore += 1;
    } else if (platform.includes('Mac') && !ua.includes('Mac')) {
      anomalies.push('platform-ua-mismatch-mac');
      totalScore += 1;
    } else if (platform.includes('Linux') && !ua.includes('Linux') && !ua.includes('Android')) {
      anomalies.push('platform-ua-mismatch-linux');
      totalScore += 1;
    }

    // Check for empty or suspicious platform.
    checksPerformed++;
    const isModernChrome = ua.includes('Chrome') && !ua.includes('Chromium');
    if (!isModernChrome && (!platform || platform === '' || platform === 'undefined')) {
      anomalies.push('empty-platform');
      totalScore += 1;
    }

    // Language consistency
    checksPerformed++;
    if (navigator.language && navigator.languages) {
      if (!navigator.languages.includes(navigator.language)) {
        anomalies.push('language-mismatch');
        totalScore += 0.5;
      }
    }

    // Check vendor consistency with browser
    checksPerformed++;
    if (ua.includes('Chrome') && navigator.vendor !== 'Google Inc.') {
      anomalies.push('vendor-mismatch-chrome');
      totalScore += 0.5;
    } else if (ua.includes('Firefox') && navigator.vendor !== '') {
      anomalies.push('vendor-mismatch-firefox');
      totalScore += 0.5;
    } else if (ua.includes('Safari') && !ua.includes('Chrome') && 
               navigator.vendor !== 'Apple Computer, Inc.') {
      anomalies.push('vendor-mismatch-safari');
      totalScore += 0.5;
    }

    // Check for hardwareConcurrency anomaly
    checksPerformed++;
    if (typeof navigator.hardwareConcurrency !== 'undefined') {
      if (navigator.hardwareConcurrency === 0 || navigator.hardwareConcurrency > 128) {
        anomalies.push('suspicious-hardware-concurrency');
        totalScore += 0.5;
      }
    }

    // Check deviceMemory if available
    checksPerformed++;
    if (typeof navigator.deviceMemory !== 'undefined') {
      if (navigator.deviceMemory === 0 || navigator.deviceMemory > 512) {
        anomalies.push('suspicious-device-memory');
        totalScore += 0.5;
      }
    }

    // Check maxTouchPoints consistency
    checksPerformed++;
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const hasTouchPoints = navigator.maxTouchPoints > 0;
    
    // Desktop claiming touch or mobile with no touch
    if (!isMobileUA && navigator.maxTouchPoints > 5) {
      anomalies.push('desktop-high-touch-points');
      totalScore += 0.3;
    }

    // Check for overridden properties (common in spoofing)
    checksPerformed++;
    try {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
      if (desc && desc.get && desc.get.toString().includes('native code') === false) {
        anomalies.push('spoofed-user-agent');
        totalScore += 1;
      }
    } catch (e) {
      // Ignore errors
    }

    // Calculate confidence based on number and severity of anomalies
    const triggered = anomalies.length > 0;
    const confidence = Math.min(1, totalScore / Math.max(1, checksPerformed));

    return this.createResult(triggered, { anomalies }, confidence);
  }
}

export { NavigatorAnomalySignal };
