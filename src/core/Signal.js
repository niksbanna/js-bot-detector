/**
 * @fileoverview Base Signal class for bot detection signals.
 * All signal detectors must extend this class.
 */

/**
 * Base class for all signal detectors.
 * Signals detect specific indicators of automated browser behavior.
 * 
 * @abstract
 * @example
 * class CustomSignal extends Signal {
 *   static id = 'custom-signal';
 *   static category = 'custom';
 *   static weight = 0.5;
 *   static description = 'Detects custom bot behavior';
 *   
 *   async detect() {
 *     const isSuspicious = // ... detection logic
 *     return {
 *       triggered: isSuspicious,
 *       value: someValue,
 *       confidence: 0.8
 *     };
 *   }
 * }
 */
class Signal {
  /**
   * Unique identifier for this signal.
   * @type {string}
   */
  static id = 'base-signal';

  /**
   * Category this signal belongs to.
   * Categories: 'environment', 'behavior', 'fingerprint', 'timing', 'automation'
   * @type {string}
   */
  static category = 'uncategorized';

  /**
   * Weight of this signal in the scoring calculation.
   * Range: 0.1 (low importance) to 1.0 (high importance)
   * @type {number}
   */
  static weight = 0.5;

  /**
   * Human-readable description of what this signal detects.
   * @type {string}
   */
  static description = 'Base signal class';

  /**
   * Whether this signal requires user interaction before it can detect.
   * @type {boolean}
   */
  static requiresInteraction = false;

  /**
   * Creates a new Signal instance.
   * @param {Object} [options={}] - Configuration options for this signal.
   */
  constructor(options = {}) {
    this.options = options;
    this._lastResult = null;
  }

  /**
   * Get the signal's unique identifier.
   * @returns {string}
   */
  get id() {
    return this.constructor.id;
  }

  /**
   * Get the signal's category.
   * @returns {string}
   */
  get category() {
    return this.constructor.category;
  }

  /**
   * Get the signal's weight.
   * @returns {number}
   */
  get weight() {
    return this.options.weight ?? this.constructor.weight;
  }

  /**
   * Get the signal's description.
   * @returns {string}
   */
  get description() {
    return this.constructor.description;
  }

  /**
   * Check if this signal requires interaction.
   * @returns {boolean}
   */
  get requiresInteraction() {
    return this.constructor.requiresInteraction;
  }

  /**
   * Get the last detection result.
   * @returns {SignalResult|null}
   */
  get lastResult() {
    return this._lastResult;
  }

  /**
   * Perform the detection check.
   * Must be overridden by subclasses.
   * 
   * @abstract
   * @returns {Promise<SignalResult>} Detection result
   * @throws {Error} If not implemented by subclass
   */
  async detect() {
    throw new Error(`Signal.detect() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Run detection and cache the result.
   * @returns {Promise<SignalResult>}
   */
  async run() {
    try {
      this._lastResult = await this.detect();
      return this._lastResult;
    } catch (error) {
      // Fail-safe: if detection throws, treat as not triggered
      this._lastResult = {
        triggered: false,
        value: null,
        confidence: 0,
        error: error.message,
      };
      return this._lastResult;
    }
  }

  /**
   * Reset the signal state.
   */
  reset() {
    this._lastResult = null;
  }

  /**
   * Create a result object with defaults.
   * @param {boolean} triggered - Whether the signal was triggered
   * @param {*} [value=null] - Optional value associated with the detection
   * @param {number} [confidence=1] - Confidence level (0-1)
   * @returns {SignalResult}
   */
  createResult(triggered, value = null, confidence = 1) {
    return {
      triggered: Boolean(triggered),
      value,
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }
}

/**
 * @typedef {Object} SignalResult
 * @property {boolean} triggered - Whether the signal detected bot behavior
 * @property {*} value - Associated value or evidence
 * @property {number} confidence - Confidence level between 0 and 1
 * @property {string} [error] - Error message if detection failed
 */

export { Signal };
