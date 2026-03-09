/**
 * @fileoverview Main BotDetector orchestrator class.
 */

import { Signal } from './Signal.js';
import { ScoringEngine } from './ScoringEngine.js';
import { VerdictEngine, Verdict } from './VerdictEngine.js';

/**
 * Main bot detection orchestrator.
 * Manages signals, runs detection, and produces verdicts.
 * 
 * @example
 * const detector = new BotDetector();
 * const result = await detector.detect();
 * console.log(result.verdict); // 'human', 'suspicious', or 'bot'
 */
class BotDetector {
  /**
   * Creates a new BotDetector instance.
   * @param {Object} [options={}] - Configuration options
   * @param {Array<Signal>} [options.signals=[]] - Initial signals to register
   * @param {Object.<string, number>} [options.weightOverrides={}] - Override signal weights
   * @param {number} [options.humanThreshold=20] - Score threshold for human verdict
   * @param {number} [options.suspiciousThreshold=50] - Score threshold for suspicious verdict
   * @param {Array<string>} [options.instantBotSignals=[]] - Signal IDs that instantly flag as bot
   * @param {boolean} [options.includeDefaults=true] - Include built-in signal detectors
   * @param {number} [options.detectionTimeout=5000] - Timeout for detection in ms
   */
  constructor(options = {}) {
    this.options = options;
    this._signals = new Map();
    this._scoringEngine = new ScoringEngine({
      weightOverrides: options.weightOverrides,
    });
    this._verdictEngine = new VerdictEngine({
      humanThreshold: options.humanThreshold,
      suspiciousThreshold: options.suspiciousThreshold,
      instantBotSignals: options.instantBotSignals,
    });
    this._lastDetection = null;
    this._detectionTimeout = options.detectionTimeout || 5000;
    this._isRunning = false;

    // Register initial signals
    if (options.signals) {
      for (const signal of options.signals) {
        this.registerSignal(signal);
      }
    }
  }

  /**
   * Register a signal detector.
   * @param {Signal} signal - Signal instance to register
   * @returns {BotDetector} this instance for chaining
   * @throws {Error} If signal with same ID already registered
   */
  registerSignal(signal) {
    if (!(signal instanceof Signal)) {
      throw new Error('Signal must be an instance of Signal class');
    }
    
    const id = signal.id;
    if (this._signals.has(id)) {
      throw new Error(`Signal with ID "${id}" is already registered`);
    }
    
    this._signals.set(id, signal);
    return this;
  }

  /**
   * Register multiple signals at once.
   * @param {Array<Signal>} signals - Array of signal instances
   * @returns {BotDetector} this instance for chaining
   */
  registerSignals(signals) {
    for (const signal of signals) {
      this.registerSignal(signal);
    }
    return this;
  }

  /**
   * Unregister a signal by ID.
   * @param {string} signalId - Signal ID to remove
   * @returns {boolean} True if signal was removed
   */
  unregisterSignal(signalId) {
    return this._signals.delete(signalId);
  }

  /**
   * Get a registered signal by ID.
   * @param {string} signalId - Signal ID
   * @returns {Signal|undefined}
   */
  getSignal(signalId) {
    return this._signals.get(signalId);
  }

  /**
   * Get all registered signals.
   * @returns {Array<Signal>}
   */
  getSignals() {
    return Array.from(this._signals.values());
  }

  /**
   * Get signals by category.
   * @param {string} category - Category name
   * @returns {Array<Signal>}
   */
  getSignalsByCategory(category) {
    return this.getSignals().filter(s => s.category === category);
  }

  /**
   * Run all signal detectors and calculate verdict.
   * @param {Object} [options={}] - Detection options
   * @param {boolean} [options.skipInteractionSignals=false] - Skip signals requiring interaction
   * @returns {Promise<DetectionResult>}
   */
  async detect(options = {}) {
    if (this._isRunning) {
      throw new Error('Detection is already running');
    }

    this._isRunning = true;
    this._scoringEngine.reset();

    const startTime = performance.now();
    const signalResults = new Map();
    
    try {
      // Filter signals based on options
      const signalsToRun = this.getSignals().filter(signal => {
        if (options.skipInteractionSignals && signal.requiresInteraction) {
          return false;
        }
        return true;
      });

      // Run all signals with timeout
      const detectionPromises = signalsToRun.map(async signal => {
        // preventing 15 leaked timers per detect() call in SPAs.
        let timeoutId;
        const timeoutPromise = new Promise(resolve => {
          timeoutId = setTimeout(() => resolve({
            triggered: false,
            value: null,
            confidence: 0,
            error: 'timeout',
          }), this._detectionTimeout);
        });

        const result = await Promise.race([signal.run(), timeoutPromise]);
        clearTimeout(timeoutId);
        return { signal, result };
      });

      const results = await Promise.all(detectionPromises);

      // Process results
      for (const { signal, result } of results) {
        signalResults.set(signal.id, {
          ...result,
          category: signal.category,
          weight: signal.weight,
          description: signal.description,
        });

        this._scoringEngine.addResult(signal.id, result, signal.weight);
      }

      // Calculate score and verdict
      const score = this._scoringEngine.calculate();
      const triggeredSignals = this._scoringEngine.getTriggeredSignals();
      const verdict = this._verdictEngine.getVerdict(score, triggeredSignals);

      const detectionTime = performance.now() - startTime;

      this._lastDetection = {
        ...verdict,
        signals: Object.fromEntries(signalResults),
        breakdown: this._scoringEngine.getBreakdown(),
        timestamp: Date.now(),
        detectionTimeMs: Math.round(detectionTime),
        totalSignals: signalsToRun.length,
        triggeredSignals,
      };

      return this._lastDetection;
    } finally {
      this._isRunning = false;
    }
  }

  /**
   * Get the last detection result.
   * @returns {DetectionResult|null}
   */
  getLastDetection() {
    return this._lastDetection;
  }

  /**
   * Get the current score (from last detection).
   * @returns {number}
   */
  getScore() {
    return this._lastDetection?.score ?? 0;
  }

  /**
   * Get triggered signals from last detection.
   * @returns {Array<string>}
   */
  getTriggeredSignals() {
    return this._lastDetection?.triggeredSignals ?? [];
  }

  /**
   * Check if detection is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  /**
   * Reset the detector state.
   */
  reset() {
    this._scoringEngine.reset();
    this._lastDetection = null;
    for (const signal of this._signals.values()) {
      signal.reset();
    }
  }

  /**
   * Update configuration options.
   * @param {Object} options - New options
   */
  configure(options) {
    if (options.humanThreshold !== undefined || options.suspiciousThreshold !== undefined) {
      this._verdictEngine.setThresholds({
        human: options.humanThreshold,
        suspicious: options.suspiciousThreshold,
      });
    }
    if (options.detectionTimeout !== undefined) {
      this._detectionTimeout = options.detectionTimeout;
    }
  }

  /**
   * @deprecated Use `createDetector()` from '@niksbanna/bot-detector' instead.
   * This method cannot load default signals from here due to module boundaries.
   * 
   * @example
   * // Correct:
   * import { createDetector } from '@niksbanna/bot-detector';
   * const detector = createDetector();
   * 
   * @throws {Error} Always — to prevent silent empty-detector bugs.
   */
  static withDefaults() {
    throw new Error(
      'BotDetector.withDefaults() is not supported. ' +
      'Use createDetector() from \'@niksbanna/bot-detector\' instead:\n' +
      '  import { createDetector } from \'@niksbanna/bot-detector\';\n' +
      '  const detector = createDetector();'
    );
  }
}

/**
 * @typedef {Object} DetectionResult
 * @property {string} verdict - 'human', 'suspicious', or 'bot'
 * @property {number} score - Calculated score (0-100)
 * @property {string} confidence - Confidence level
 * @property {string} reason - Reason for verdict
 * @property {Object} signals - Map of signal ID to results
 * @property {Array<Object>} breakdown - Score contribution breakdown
 * @property {number} timestamp - Detection timestamp
 * @property {number} detectionTimeMs - Time taken for detection
 * @property {number} totalSignals - Total signals evaluated
 * @property {Array<string>} triggeredSignals - IDs of triggered signals
 */

export { BotDetector, Verdict };
