/**
 * @fileoverview Verdict engine that determines bot/human classification.
 */

/**
 * Possible verdicts from detection.
 * @enum {string}
 */
const Verdict = {
  HUMAN: 'human',
  SUSPICIOUS: 'suspicious',
  BOT: 'bot',
};

/**
 * Determines the final verdict based on score and triggered signals.
 */
class VerdictEngine {
  /**
   * Default threshold configuration.
   * @type {Object}
   */
  static DEFAULT_THRESHOLDS = {
    human: 20,      // score < 20 = human
    suspicious: 50, // 20 <= score < 50 = suspicious
    // score >= 50 = bot
  };

  /**
   * Creates a new VerdictEngine instance.
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.humanThreshold=20] - Max score for human verdict
   * @param {number} [options.suspiciousThreshold=50] - Max score for suspicious verdict
   * @param {Array<string>} [options.instantBotSignals=[]] - Signal IDs that instantly flag as bot
   */
  constructor(options = {}) {
    this.humanThreshold = options.humanThreshold ?? VerdictEngine.DEFAULT_THRESHOLDS.human;
    this.suspiciousThreshold = options.suspiciousThreshold ?? VerdictEngine.DEFAULT_THRESHOLDS.suspicious;
    this.instantBotSignals = new Set(options.instantBotSignals || []);
  }

  /**
   * Get the verdict based on score and triggered signals.
   * @param {number} score - Calculated score (0-100)
   * @param {Array<string>} triggeredSignals - List of triggered signal IDs
   * @returns {VerdictResult}
   */
  getVerdict(score, triggeredSignals = []) {
    // Check for instant bot signals first
    for (const signalId of triggeredSignals) {
      if (this.instantBotSignals.has(signalId)) {
        // Ensure the score is consistent with the bot verdict.
        // A "bot" verdict requires score >= suspiciousThreshold, so clamp upward
        // when the raw score would otherwise fall below that boundary.
        const consistentScore = Math.max(score, this.suspiciousThreshold);
        return {
          verdict: Verdict.BOT,
          score: consistentScore,
          confidence: 'high',
          reason: `Instant bot signal triggered: ${signalId}`,
          triggeredCount: triggeredSignals.length,
        };
      }
    }

    // Score-based verdict
    let verdict;
    let confidence;
    let reason;

    if (score < this.humanThreshold) {
      verdict = Verdict.HUMAN;
      confidence = score < 10 ? 'high' : 'medium';
      reason = 'Low bot score';
    } else if (score < this.suspiciousThreshold) {
      verdict = Verdict.SUSPICIOUS;
      confidence = 'medium';
      reason = 'Moderate bot indicators detected';
    } else {
      verdict = Verdict.BOT;
      confidence = score >= 75 ? 'high' : 'medium';
      reason = 'High accumulation of bot indicators';
    }

    return {
      verdict,
      score,
      confidence,
      reason,
      triggeredCount: triggeredSignals.length,
    };
  }

  /**
   * Check if signal should instantly flag as bot.
   * @param {string} signalId - Signal identifier
   * @returns {boolean}
   */
  isInstantBotSignal(signalId) {
    return this.instantBotSignals.has(signalId);
  }

  /**
   * Add a signal to the instant bot list.
   * @param {string} signalId - Signal identifier
   */
  addInstantBotSignal(signalId) {
    this.instantBotSignals.add(signalId);
  }

  /**
   * Update thresholds.
   * @param {Object} thresholds - New threshold values
   * @param {number} [thresholds.human] - New human threshold
   * @param {number} [thresholds.suspicious] - New suspicious threshold
   */
  setThresholds(thresholds) {
    if (thresholds.human !== undefined) {
      this.humanThreshold = thresholds.human;
    }
    if (thresholds.suspicious !== undefined) {
      this.suspiciousThreshold = thresholds.suspicious;
    }
  }
}

/**
 * @typedef {Object} VerdictResult
 * @property {string} verdict - 'human', 'suspicious', or 'bot'
 * @property {number} score - The calculated score
 * @property {string} confidence - 'low', 'medium', or 'high'
 * @property {string} reason - Human-readable reason for verdict
 * @property {number} triggeredCount - Number of triggered signals
 */

export { VerdictEngine, Verdict };
