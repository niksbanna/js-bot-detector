/**
 * @fileoverview Detects non-human scroll patterns.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Tracks and analyzes scroll behavior patterns.
 * Detects programmatic scrolling and non-human scroll patterns.
 */
class ScrollBehaviorSignal extends Signal {
  static id = 'scroll-behavior';
  static category = 'behavior';
  static weight = 0.5;
  static description = 'Detects programmatic scroll patterns';
  static requiresInteraction = true;

  constructor(options = {}) {
    super(options);
    this._scrollEvents = [];
    this._isTracking = false;
    this._trackingDuration = options.trackingDuration || 3000;
    this._boundHandler = null;
  }

  /**
   * Start tracking scroll events.
   */
  startTracking() {
    if (this._isTracking) return;
    
    this._scrollEvents = [];
    this._isTracking = true;
    
    this._boundHandler = () => {
      this._scrollEvents.push({
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        t: performance.now(),
      });
    };
    
    window.addEventListener('scroll', this._boundHandler, { passive: true });
  }

  /**
   * Stop tracking scroll events.
   */
  stopTracking() {
    if (!this._isTracking) return;
    
    this._isTracking = false;
    if (this._boundHandler) {
      window.removeEventListener('scroll', this._boundHandler);
      this._boundHandler = null;
    }
  }

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Start tracking if needed
    if (this._scrollEvents.length === 0) {
      this.startTracking();
      await new Promise(resolve => setTimeout(resolve, this._trackingDuration));
      this.stopTracking();
    }

    const events = this._scrollEvents;

    // No scroll events - not necessarily suspicious
    if (events.length < 3) {
      return this.createResult(false, {
        reason: 'insufficient-scroll-data',
        scrollEvents: events.length,
      }, 0);
    }

    const analysis = this._analyzeScrollPatterns(events);

    // Check for instant jumps (scrollTo without animation)
    if (analysis.instantJumps > 0) {
      anomalies.push('instant-scroll-jumps');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for perfectly consistent scroll speed
    if (analysis.velocityVariance < 0.1 && events.length > 10) {
      anomalies.push('constant-scroll-velocity');
      confidence = Math.max(confidence, 0.6);
    }

    // Check for no momentum (instant stops)
    if (analysis.momentumEvents === 0 && events.length > 5) {
      anomalies.push('no-scroll-momentum');
      confidence = Math.max(confidence, 0.5);
    }

    // Check for perfectly even scroll intervals
    if (analysis.intervalVariance < 5 && events.length > 10) {
      anomalies.push('robotic-scroll-timing');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for exclusively vertical or horizontal scroll
    if (analysis.scrollDirections === 1 && Math.abs(analysis.totalScrollY) > 1000) {
      // Could be normal, but combined with other factors is suspicious
      if (analysis.velocityVariance < 1) {
        anomalies.push('one-dimensional-scroll');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check for scroll-to-element patterns (exact positions)
    if (analysis.exactPositionScrolls > 2) {
      anomalies.push('exact-position-scrolls');
      confidence = Math.max(confidence, 0.6);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      scrollEventCount: events.length,
      analysis,
    }, confidence);
  }

  /**
   * Analyze scroll patterns for anomalies.
   * @param {Array} events - Array of scroll events
   * @returns {Object} Analysis results
   */
  _analyzeScrollPatterns(events) {
    if (events.length < 2) {
      return {
        instantJumps: 0,
        velocityVariance: 0,
        momentumEvents: 0,
        intervalVariance: 0,
        scrollDirections: 0,
        totalScrollY: 0,
        exactPositionScrolls: 0,
      };
    }

    let instantJumps = 0;
    let momentumEvents = 0;
    const velocities = [];
    const intervals = [];
    let hasVertical = false;
    let hasHorizontal = false;
    let exactPositionScrolls = 0;

    // Common scroll targets (element heights, percentages)
    const commonPositions = [0, 100, 200, 300, 400, 500, 600, 800, 1000];

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      
      const dy = curr.scrollY - prev.scrollY;
      const dx = curr.scrollX - prev.scrollX;
      const dt = curr.t - prev.t;
      
      intervals.push(dt);

      if (Math.abs(dy) > 0) hasVertical = true;
      if (Math.abs(dx) > 0) hasHorizontal = true;

      if (dt === 0) continue;

      const velocity = Math.sqrt(dy * dy + dx * dx) / dt;
      velocities.push(velocity);

      // Instant jump: large distance in very short time (< 16ms, one frame)
      const distance = Math.abs(dy) + Math.abs(dx);
      if (distance > 200 && dt < 20) {
        instantJumps++;
      }

      // Momentum: decreasing velocity (natural scroll deceleration)
      if (i > 1 && velocities.length > 1) {
        const prevVelocity = velocities[velocities.length - 2];
        if (velocity < prevVelocity * 0.9 && velocity > 0) {
          momentumEvents++;
        }
      }

      // Check for exact positions
      if (commonPositions.includes(Math.round(curr.scrollY))) {
        exactPositionScrolls++;
      }
    }

    // Calculate velocity variance
    const avgVelocity = velocities.length > 0 
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
      : 0;
    const velocityVariance = velocities.length > 0
      ? velocities.reduce((acc, v) => acc + Math.pow(v - avgVelocity, 2), 0) / velocities.length
      : 0;

    // Calculate interval variance
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((acc, t) => 
      acc + Math.pow(t - avgInterval, 2), 0) / intervals.length;

    // Count scroll directions
    let scrollDirections = 0;
    if (hasVertical) scrollDirections++;
    if (hasHorizontal) scrollDirections++;

    // Total scroll distance
    const totalScrollY = events[events.length - 1].scrollY - events[0].scrollY;

    return {
      instantJumps,
      velocityVariance,
      momentumEvents,
      intervalVariance,
      scrollDirections,
      totalScrollY,
      exactPositionScrolls,
    };
  }

  reset() {
    super.reset();
    this.stopTracking();
    this._scrollEvents = [];
  }
}

export { ScrollBehaviorSignal };
