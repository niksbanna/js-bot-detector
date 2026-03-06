/**
 * @fileoverview Main entry point for the bot detection library.
 * @module @niksbanna/bot-detector
 */

// Core classes
import { BotDetector } from './core/BotDetector.js';
import { Signal } from './core/Signal.js';
import { ScoringEngine } from './core/ScoringEngine.js';
import { VerdictEngine, Verdict } from './core/VerdictEngine.js';

// Environment signals
import {
  WebDriverSignal,
  HeadlessSignal,
  NavigatorAnomalySignal,
  PermissionsSignal,
} from './signals/environment/index.js';

// Behavioral signals
import {
  MouseMovementSignal,
  KeyboardPatternSignal,
  InteractionTimingSignal,
  ScrollBehaviorSignal,
} from './signals/behavior/index.js';

// Fingerprint signals
import {
  PluginsSignal,
  WebGLSignal,
  CanvasSignal,
  AudioContextSignal,
  ScreenSignal,
} from './signals/fingerprint/index.js';

// Timing signals
import {
  PageLoadSignal,
  DOMContentTimingSignal,
} from './signals/timing/index.js';

// Automation framework signals
import {
  PuppeteerSignal,
  PlaywrightSignal,
  SeleniumSignal,
  PhantomJSSignal,
} from './signals/automation/index.js';

/**
 * All built-in signal classes organized by category.
 */
const Signals = {
  // Environment signals
  WebDriverSignal,
  HeadlessSignal,
  NavigatorAnomalySignal,
  PermissionsSignal,
  
  // Behavioral signals
  MouseMovementSignal,
  KeyboardPatternSignal,
  InteractionTimingSignal,
  ScrollBehaviorSignal,
  
  // Fingerprint signals
  PluginsSignal,
  WebGLSignal,
  CanvasSignal,
  AudioContextSignal,
  ScreenSignal,
  
  // Timing signals
  PageLoadSignal,
  DOMContentTimingSignal,
  
  // Automation framework signals
  PuppeteerSignal,
  PlaywrightSignal,
  SeleniumSignal,
  PhantomJSSignal,
};

/**
 * Default signal instances that don't require user interaction.
 * These are suitable for immediate detection on page load.
 */
const defaultInstantSignals = [
  new WebDriverSignal(),
  new HeadlessSignal(),
  new NavigatorAnomalySignal(),
  new PermissionsSignal(),
  new PluginsSignal(),
  new WebGLSignal(),
  new CanvasSignal(),
  new AudioContextSignal(),
  new ScreenSignal(),
  new PageLoadSignal(),
  new DOMContentTimingSignal(),
  new PuppeteerSignal(),
  new PlaywrightSignal(),
  new SeleniumSignal(),
  new PhantomJSSignal(),
];

/**
 * Signal instances that require user interaction to be meaningful.
 * These track mouse, keyboard, and scroll behavior over time.
 */
const defaultInteractionSignals = [
  new MouseMovementSignal(),
  new KeyboardPatternSignal(),
  new InteractionTimingSignal(),
  new ScrollBehaviorSignal(),
];

/**
 * All default signal instances.
 */
const defaultSignals = [...defaultInstantSignals, ...defaultInteractionSignals];

/**
 * Create a BotDetector with all default signals registered.
 * This is the recommended way to create a detector for most use cases.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {Object.<string, number>} [options.weightOverrides={}] - Override signal weights
 * @param {number} [options.humanThreshold=20] - Score threshold for human verdict
 * @param {number} [options.suspiciousThreshold=50] - Score threshold for suspicious verdict
 * @param {Array<string>} [options.instantBotSignals=['webdriver', 'puppeteer', 'playwright', 'selenium', 'phantomjs']] - Signals that instantly flag as bot
 * @param {boolean} [options.includeInteractionSignals=true] - Include signals requiring interaction
 * @param {number} [options.detectionTimeout=5000] - Timeout for detection in ms
 * @returns {BotDetector}
 * 
 * @example
 * // Basic usage
 * const detector = createDetector();
 * const result = await detector.detect();
 * 
 * @example
 * // Custom thresholds
 * const detector = createDetector({
 *   humanThreshold: 15,
 *   suspiciousThreshold: 40,
 * });
 * 
 * @example
 * // Skip interaction signals for instant detection
 * const detector = createDetector({
 *   includeInteractionSignals: false,
 * });
 */
function createDetector(options = {}) {
  const {
    includeInteractionSignals = true,
    instantBotSignals = ['webdriver', 'puppeteer', 'playwright', 'selenium', 'phantomjs'],
    ...detectorOptions
  } = options;

  const signals = includeInteractionSignals 
    ? [...defaultInstantSignals, ...defaultInteractionSignals.map(s => {
        // Create fresh instances for interaction signals
        const SignalClass = s.constructor;
        return new SignalClass(s.options);
      })]
    : defaultInstantSignals.map(s => {
        const SignalClass = s.constructor;
        return new SignalClass(s.options);
      });

  return new BotDetector({
    signals,
    instantBotSignals,
    ...detectorOptions,
  });
}

/**
 * Quick detection function for simple use cases.
 * Creates a detector, runs detection, and returns result.
 * 
 * @param {Object} [options={}] - Detection options
 * @param {boolean} [options.skipInteractionSignals=false] - Skip signals requiring interaction
 * @returns {Promise<DetectionResult>}
 * 
 * @example
 * const result = await detect();
 * if (result.verdict === 'bot') {
 *   console.log('Bot detected!', result.score);
 * }
 */
async function detect(options = {}) {
  const detector = createDetector({
    includeInteractionSignals: !options.skipInteractionSignals,
  });
  return detector.detect(options);
}

/**
 * Quick detection that only runs instant signals (no interaction required).
 * Suitable for immediate detection on page load.
 * 
 * @returns {Promise<DetectionResult>}
 * 
 * @example
 * document.addEventListener('DOMContentLoaded', async () => {
 *   const result = await detectInstant();
 *   console.log('Verdict:', result.verdict);
 * });
 */
async function detectInstant() {
  return detect({ skipInteractionSignals: true });
}

// Export everything
export {
  // Main class
  BotDetector,
  
  // Factory functions
  createDetector,
  detect,
  detectInstant,
  
  // Base classes
  Signal,
  ScoringEngine,
  VerdictEngine,
  
  // Enums
  Verdict,
  
  // Signal classes (for custom registration)
  Signals,
  
  // Individual signals
  WebDriverSignal,
  HeadlessSignal,
  NavigatorAnomalySignal,
  PermissionsSignal,
  MouseMovementSignal,
  KeyboardPatternSignal,
  InteractionTimingSignal,
  ScrollBehaviorSignal,
  PluginsSignal,
  WebGLSignal,
  CanvasSignal,
  AudioContextSignal,
  ScreenSignal,
  PageLoadSignal,
  DOMContentTimingSignal,
  PuppeteerSignal,
  PlaywrightSignal,
  SeleniumSignal,
  PhantomJSSignal,
  
  // Default signal instances
  defaultSignals,
  defaultInstantSignals,
  defaultInteractionSignals,
};

// Default export for convenience
export default {
  BotDetector,
  createDetector,
  detect,
  detectInstant,
  Signal,
  Signals,
  Verdict,
};
