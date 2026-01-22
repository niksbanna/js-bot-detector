/**
 * @fileoverview Detects suspicious interaction timing patterns.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Measures timing between page load and first interaction.
 * Bots often interact too fast or with perfect timing patterns.
 */
class InteractionTimingSignal extends Signal {
  static id = 'interaction-timing';
  static category = 'behavior';
  static weight = 0.6;
  static description = 'Detects suspicious interaction timing';
  static requiresInteraction = true;

  constructor(options = {}) {
    super(options);
    this._pageLoadTime = performance.now();
    this._firstInteractionTime = null;
    this._interactions = [];
    this._isTracking = false;
    this._trackingDuration = options.trackingDuration || 5000;
    this._boundHandler = null;
  }

  /**
   * Start tracking interactions.
   */
  startTracking() {
    if (this._isTracking) return;
    
    this._interactions = [];
    this._isTracking = true;
    
    const interactionEvents = ['click', 'mousedown', 'touchstart', 'keydown', 'scroll'];
    
    this._boundHandler = (e) => {
      const now = performance.now();
      if (this._firstInteractionTime === null) {
        this._firstInteractionTime = now;
      }
      this._interactions.push({
        type: e.type,
        t: now,
        timeSinceLoad: now - this._pageLoadTime,
      });
    };
    
    for (const event of interactionEvents) {
      document.addEventListener(event, this._boundHandler, { passive: true, capture: true });
    }
  }

  /**
   * Stop tracking interactions.
   */
  stopTracking() {
    if (!this._isTracking) return;
    
    this._isTracking = false;
    const interactionEvents = ['click', 'mousedown', 'touchstart', 'keydown', 'scroll'];
    
    if (this._boundHandler) {
      for (const event of interactionEvents) {
        document.removeEventListener(event, this._boundHandler, { capture: true });
      }
      this._boundHandler = null;
    }
  }

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Start tracking if not already
    if (!this._isTracking && this._interactions.length === 0) {
      this.startTracking();
      await new Promise(resolve => setTimeout(resolve, this._trackingDuration));
      this.stopTracking();
    }

    const interactions = this._interactions;

    // No interactions - not necessarily suspicious, could be passive viewing
    if (interactions.length === 0) {
      return this.createResult(false, { 
        reason: 'no-interactions',
      }, 0);
    }

    // Check time to first interaction
    const firstInteraction = interactions[0];
    
    // Suspiciously fast first interaction (< 100ms after page load)
    if (firstInteraction.timeSinceLoad < 100) {
      anomalies.push('instant-interaction');
      confidence = Math.max(confidence, 0.9);
    }
    // Very fast interaction (< 300ms)
    else if (firstInteraction.timeSinceLoad < 300) {
      anomalies.push('very-fast-interaction');
      confidence = Math.max(confidence, 0.6);
    }

    // Analyze interaction intervals
    if (interactions.length > 3) {
      const intervals = [];
      for (let i = 1; i < interactions.length; i++) {
        intervals.push(interactions[i].t - interactions[i - 1].t);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, t) => 
        acc + Math.pow(t - avgInterval, 2), 0) / intervals.length;

      // Perfectly timed intervals (robotic)
      if (variance < 10 && interactions.length > 5) {
        anomalies.push('robotic-intervals');
        confidence = Math.max(confidence, 0.8);
      }

      // Check for burst interactions (many in short time)
      const burstThreshold = 50; // ms
      let burstCount = 0;
      for (const interval of intervals) {
        if (interval < burstThreshold) burstCount++;
      }
      if (burstCount > intervals.length * 0.7) {
        anomalies.push('burst-interactions');
        confidence = Math.max(confidence, 0.7);
      }
    }

    // Check interaction sequence (bots often follow predictable patterns)
    const typeSequence = interactions.map(i => i.type).join(',');
    
    // Repeated identical sequences
    if (interactions.length >= 6) {
      const halfLength = Math.floor(interactions.length / 2);
      const firstHalf = interactions.slice(0, halfLength).map(i => i.type).join(',');
      const secondHalf = interactions.slice(halfLength, halfLength * 2).map(i => i.type).join(',');
      
      if (firstHalf === secondHalf && firstHalf.length > 0) {
        anomalies.push('repeated-sequence');
        confidence = Math.max(confidence, 0.6);
      }
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      interactionCount: interactions.length,
      timeToFirstInteraction: firstInteraction.timeSinceLoad,
      firstInteractionType: firstInteraction.type,
    }, confidence);
  }

  reset() {
    super.reset();
    this.stopTracking();
    this._pageLoadTime = performance.now();
    this._firstInteractionTime = null;
    this._interactions = [];
  }
}

export { InteractionTimingSignal };
