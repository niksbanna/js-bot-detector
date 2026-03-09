/**
 * @fileoverview Scoring engine that calculates bot probability from signals.
 */

/**
 * Calculates a weighted score from signal results.
 * Score represents the probability of the visitor being a bot.
 */
class ScoringEngine {
  /**
   * Creates a new ScoringEngine instance.
   * @param {Object} [options={}] - Configuration options
   * @param {Object.<string, number>} [options.weightOverrides={}] - Override weights by signal ID
   * @param {number} [options.maxScore=100] - Maximum possible score
   */
  constructor(options = {}) {
    this.weightOverrides = options.weightOverrides || {};
    this.maxScore = options.maxScore || 100;
    this._results = new Map();
  }

  /**
   * Get the effective weight for a signal.
   * @param {string} signalId - Signal identifier
   * @param {number} defaultWeight - Default weight from signal definition
   * @returns {number}
   */
  getWeight(signalId, defaultWeight) {
    return this.weightOverrides[signalId] ?? defaultWeight;
  }

  /**
   * Add a signal result to the scoring calculation.
   * @param {string} signalId - Signal identifier
   * @param {Object} result - Signal detection result
   * @param {boolean} result.triggered - Whether signal was triggered
   * @param {number} result.confidence - Confidence level (0-1)
   * @param {number} weight - Signal weight (0.1-1.0)
   */
  addResult(signalId, result, weight) {
    const effectiveWeight = this.getWeight(signalId, weight);
    this._results.set(signalId, {
      ...result,
      weight: effectiveWeight,
      contribution: result.triggered ? effectiveWeight * result.confidence : 0,
    });
  }

  /**
   * Calculate the final score from all added results.
   * Formula: (sum of contributions / sum of weights) * maxScore
   * 
   * @returns {number} Score between 0 and maxScore
   */
  calculate() {
    if (this._results.size === 0) {
      return 0;
    }

    let totalWeight = 0;
    let totalContribution = 0;

    for (const [, data] of this._results) {
      totalWeight += data.weight;
      totalContribution += data.contribution;
    }

    if (totalWeight === 0) {
      return 0;
    }

    const score = (totalContribution / totalWeight) * this.maxScore;
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get detailed breakdown of score contributions.
   * @returns {Array<Object>} Array of signal contributions
   */
  getBreakdown() {
    const breakdown = [];
    const score = this.calculate();
    
    for (const [signalId, data] of this._results) {
      breakdown.push({
        signalId,
        triggered: data.triggered,
        confidence: data.confidence,
        weight: data.weight,
        contribution: data.contribution,
        percentOfScore: score > 0
          ? (data.contribution / score * 100).toFixed(1)
          : '0.0',
      });
    }

    // Sort by contribution (highest first)
    return breakdown.sort((a, b) => b.contribution - a.contribution);
  }

  /**
   * Get all triggered signals.
   * @returns {Array<string>} Array of triggered signal IDs
   */
  getTriggeredSignals() {
    const triggered = [];
    for (const [signalId, data] of this._results) {
      if (data.triggered) {
        triggered.push(signalId);
      }
    }
    return triggered;
  }

  /**
   * Get the number of triggered signals.
   * @returns {number}
   */
  getTriggeredCount() {
    let count = 0;
    for (const [, data] of this._results) {
      if (data.triggered) count++;
    }
    return count;
  }

  /**
   * Reset all stored results.
   */
  reset() {
    this._results.clear();
  }
}

export { ScoringEngine };
