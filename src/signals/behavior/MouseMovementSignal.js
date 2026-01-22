/**
 * @fileoverview Detects non-human mouse movement patterns.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Tracks and analyzes mouse movement patterns.
 * Bots often have perfectly linear paths, no movement, or teleportation.
 */
class MouseMovementSignal extends Signal {
  static id = 'mouse-movement';
  static category = 'behavior';
  static weight = 0.9;
  static description = 'Detects non-human mouse movement patterns';
  static requiresInteraction = true;

  constructor(options = {}) {
    super(options);
    this._movements = [];
    this._isTracking = false;
    this._trackingDuration = options.trackingDuration || 3000; // Default 3 seconds
    this._minMovements = options.minMovements || 5;
    this._boundHandler = null;
  }

  /**
   * Start tracking mouse movements.
   * @returns {Promise<void>}
   */
  startTracking() {
    if (this._isTracking) return;
    
    this._movements = [];
    this._isTracking = true;
    
    this._boundHandler = (e) => {
      this._movements.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
      });
    };
    
    document.addEventListener('mousemove', this._boundHandler, { passive: true });
  }

  /**
   * Stop tracking mouse movements.
   */
  stopTracking() {
    if (!this._isTracking) return;
    
    this._isTracking = false;
    if (this._boundHandler) {
      document.removeEventListener('mousemove', this._boundHandler);
      this._boundHandler = null;
    }
  }

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // If no tracking has occurred, check if we have movement data
    if (this._movements.length === 0) {
      // Start tracking for a period, then analyze
      this.startTracking();
      
      await new Promise(resolve => setTimeout(resolve, this._trackingDuration));
      
      this.stopTracking();
    }

    const movements = this._movements;

    // No mouse movements detected
    if (movements.length < this._minMovements) {
      anomalies.push('no-mouse-movement');
      confidence = Math.max(confidence, 0.6);
      return this.createResult(true, { anomalies, movements: movements.length }, confidence);
    }

    // Analyze movement patterns
    const analysis = this._analyzeMovements(movements);

    // Check for teleportation (large instant jumps)
    if (analysis.teleportCount > 0) {
      anomalies.push('mouse-teleportation');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for perfect linear paths
    if (analysis.linearPathRatio > 0.9) {
      anomalies.push('linear-path');
      confidence = Math.max(confidence, 0.8);
    }

    // Check for constant velocity (too perfect)
    if (analysis.velocityVariance < 0.01 && movements.length > 10) {
      anomalies.push('constant-velocity');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for zero acceleration changes
    if (analysis.accelerationChanges === 0 && movements.length > 10) {
      anomalies.push('no-acceleration-variance');
      confidence = Math.max(confidence, 0.6);
    }

    // Check for robotic timing (perfect intervals)
    if (analysis.timingVariance < 1 && movements.length > 10) {
      anomalies.push('robotic-timing');
      confidence = Math.max(confidence, 0.8);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      movementCount: movements.length,
      analysis,
    }, confidence);
  }

  /**
   * Analyze movement patterns for anomalies.
   * @param {Array} movements - Array of movement points
   * @returns {Object} Analysis results
   */
  _analyzeMovements(movements) {
    if (movements.length < 3) {
      return {
        teleportCount: 0,
        linearPathRatio: 0,
        velocityVariance: 0,
        accelerationChanges: 0,
        timingVariance: 0,
      };
    }

    let teleportCount = 0;
    const velocities = [];
    const angles = [];
    const timeIntervals = [];

    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dt = curr.t - prev.t;
      
      if (dt === 0) continue;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = distance / dt;
      
      velocities.push(velocity);
      angles.push(Math.atan2(dy, dx));
      timeIntervals.push(dt);

      // Teleportation: large jump in very short time
      if (distance > 300 && dt < 10) {
        teleportCount++;
      }
    }

    // Calculate velocity variance
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityVariance = velocities.reduce((acc, v) => 
      acc + Math.pow(v - avgVelocity, 2), 0) / velocities.length;

    // Calculate angle consistency (linear path detection)
    let angleConsistency = 0;
    if (angles.length > 1) {
      let consistentAngles = 0;
      for (let i = 1; i < angles.length; i++) {
        const angleDiff = Math.abs(angles[i] - angles[i - 1]);
        if (angleDiff < 0.1) consistentAngles++;
      }
      angleConsistency = consistentAngles / (angles.length - 1);
    }

    // Calculate timing variance
    const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
    const timingVariance = timeIntervals.reduce((acc, t) => 
      acc + Math.pow(t - avgInterval, 2), 0) / timeIntervals.length;

    // Count acceleration changes
    let accelerationChanges = 0;
    for (let i = 1; i < velocities.length; i++) {
      if ((velocities[i] - velocities[i - 1]) * (velocities[i - 1] - (velocities[i - 2] || 0)) < 0) {
        accelerationChanges++;
      }
    }

    return {
      teleportCount,
      linearPathRatio: angleConsistency,
      velocityVariance,
      accelerationChanges,
      timingVariance,
    };
  }

  reset() {
    super.reset();
    this.stopTracking();
    this._movements = [];
  }
}

export { MouseMovementSignal };
