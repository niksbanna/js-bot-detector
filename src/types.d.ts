/**
 * TypeScript declarations for @niksbanna/bot-detector
 */

// ── Primitives ────────────────────────────────────────────────────────────────

/** The three possible verdicts produced by the detector. */
export type VerdictValue = 'human' | 'suspicious' | 'bot';

/** Confidence band returned alongside a verdict. */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Possible verdict values, as a const object. */
export declare const Verdict: {
  readonly HUMAN: 'human';
  readonly SUSPICIOUS: 'suspicious';
  readonly BOT: 'bot';
};

// ── Result shapes ─────────────────────────────────────────────────────────────

/** Result returned by a single signal's detect() call. */
export interface SignalResult {
  /** Whether this signal was triggered (indicates bot behaviour). */
  triggered: boolean;
  /** Optional value or evidence attached to the detection. */
  value: unknown;
  /** Certainty of this result, clamped to [0, 1]. */
  confidence: number;
  /** Present only when detection failed and was swallowed gracefully. */
  error?: string;
}

/** Per-signal entry inside DetectionResult.signals. */
export interface SignalDetail extends SignalResult {
  category: string;
  weight: number;
  description: string;
}

/** One row in the score-contribution breakdown. */
export interface ScoreBreakdownEntry {
  signalId: string;
  triggered: boolean;
  confidence: number;
  weight: number;
  contribution: number;
  /** Percentage of the final score contributed by this signal (formatted string). */
  percentOfScore: string;
}

/** Full result returned by BotDetector.detect(). */
export interface DetectionResult {
  /** The final classification verdict. */
  verdict: VerdictValue;
  /** Weighted bot-probability score, 0–100. */
  score: number;
  /** Confidence band of the verdict. */
  confidence: ConfidenceLevel;
  /** Human-readable explanation of the verdict. */
  reason: string;
  /** Map of signal ID → detailed result for every evaluated signal. */
  signals: Record<string, SignalDetail>;
  /** Score-contribution breakdown, sorted descending by contribution. */
  breakdown: ScoreBreakdownEntry[];
  /** IDs of every signal that was triggered. */
  triggeredSignals: string[];
  /** Total number of signals that were evaluated. */
  totalSignals: number;
  /** Number of signals that were triggered. */
  triggeredCount: number;
  /** Unix timestamp (ms) at which detection completed. */
  timestamp: number;
  /** Wall-clock time taken for the full detection run, in milliseconds. */
  detectionTimeMs: number;
}

// ── Options ───────────────────────────────────────────────────────────────────

/** Options accepted by BotDetector and createDetector(). */
export interface DetectorOptions {
  /**
   * Scores strictly below this value receive a 'human' verdict.
   * @default 20
   */
  humanThreshold?: number;
  /**
   * Scores at or above this value receive a 'bot' verdict.
   * Scores between humanThreshold and suspiciousThreshold are 'suspicious'.
   * @default 50
   */
  suspiciousThreshold?: number;
  /**
   * Maximum time (ms) to wait for a single signal before treating it as
   * non-triggered.
   * @default 5000
   */
  detectionTimeout?: number;
  /**
   * Override the weight of specific signals by their string ID.
   * @example { 'webdriver': 0.5, 'canvas': 0.3 }
   */
  weightOverrides?: Record<string, number>;
  /**
   * Signal IDs that immediately produce a 'bot' verdict when triggered,
   * regardless of the numeric score.
   * @default ['webdriver', 'puppeteer', 'playwright', 'selenium', 'phantomjs']
   */
  instantBotSignals?: string[];
  /**
   * Whether to include mouse/keyboard/scroll behavioural signals.
   * Set to false for instant detection that does not require user interaction.
   * @default true
   */
  includeInteractionSignals?: boolean;
  /** Pre-instantiated signals to register. Used internally by createDetector(). */
  signals?: Signal[];
}

/** Options accepted by the detect() convenience function. */
export interface DetectOptions extends Omit<DetectorOptions, 'signals'> {
  /**
   * When true, skips signals that require user interaction (mouse, keyboard,
   * scroll). Equivalent to detectInstant().
   */
  skipInteractionSignals?: boolean;
}

// ── Core classes ──────────────────────────────────────────────────────────────

/**
 * Abstract base class for all bot-detection signals.
 *
 * Extend this class and implement detect() to create a custom signal:
 *
 * ```ts
 * class MySignal extends Signal {
 *   static id = 'my-signal';
 *   static category = 'custom';
 *   static weight = 0.7;
 *   static description = 'Detects my custom bot pattern';
 *
 *   async detect(): Promise<SignalResult> {
 *     const suspicious = /* your logic *\/;
 *     return this.createResult(suspicious, { detail: 'value' }, 0.9);
 *   }
 * }
 * ```
 */
export declare abstract class Signal {
  static id: string;
  static category: string;
  static weight: number;
  static description: string;
  static requiresInteraction: boolean;

  constructor(options?: Record<string, unknown>);

  get id(): string;
  get category(): string;
  get weight(): number;
  get description(): string;
  get requiresInteraction(): boolean;
  get lastResult(): SignalResult | null;

  /** Implement your detection logic here. Must be overridden by subclasses. */
  abstract detect(): Promise<SignalResult>;

  /**
   * Calls detect() and caches the result. On error, returns a non-triggered
   * result rather than throwing — signals are fail-safe by design.
   */
  run(): Promise<SignalResult>;

  /** Clears cached state so the signal can be run again cleanly. */
  reset(): void;

  /**
   * Helper that constructs a well-typed SignalResult.
   * @param triggered - Whether the signal fired.
   * @param value     - Optional evidence object. Defaults to null.
   * @param confidence - Certainty in [0, 1]. Defaults to 1.
   */
  protected createResult(
    triggered: boolean,
    value?: unknown,
    confidence?: number,
  ): SignalResult;
}

/** Calculates a weighted bot-probability score from accumulated signal results. */
export declare class ScoringEngine {
  constructor(options?: {
    weightOverrides?: Record<string, number>;
    maxScore?: number;
  });

  /** Returns the effective weight for a signal, honouring any override. */
  getWeight(signalId: string, defaultWeight: number): number;

  /** Accumulates one signal's result into the pending score. */
  addResult(signalId: string, result: SignalResult, weight: number): void;

  /** Computes and returns the final score in [0, maxScore]. */
  calculate(): number;

  /** Returns each signal's score contribution, sorted descending. */
  getBreakdown(): ScoreBreakdownEntry[];

  /** Returns the IDs of every signal that was triggered. */
  getTriggeredSignals(): string[];

  /** Returns the count of triggered signals. */
  getTriggeredCount(): number;

  /** Clears all accumulated results. */
  reset(): void;
}

/** Converts a numeric score and triggered-signal list into a final verdict. */
export declare class VerdictEngine {
  static readonly DEFAULT_THRESHOLDS: { human: number; suspicious: number };

  constructor(options?: {
    humanThreshold?: number;
    suspiciousThreshold?: number;
    instantBotSignals?: string[];
  });

  /**
   * Returns the verdict for the given score and triggered-signal set.
   * Instant-bot signals take priority over the numeric score.
   */
  getVerdict(
    score: number,
    triggeredSignals?: string[],
  ): Pick<DetectionResult, 'verdict' | 'score' | 'confidence' | 'reason' | 'triggeredCount'>;

  isInstantBotSignal(signalId: string): boolean;
  addInstantBotSignal(signalId: string): void;
  setThresholds(thresholds: { human?: number; suspicious?: number }): void;
}

/**
 * Main bot-detection orchestrator.
 *
 * Prefer the createDetector() factory for typical use cases:
 * ```ts
 * const detector = createDetector({ humanThreshold: 15 });
 * const result = await detector.detect();
 * ```
 */
export declare class BotDetector {
  constructor(options?: DetectorOptions);

  /** Registers a signal. Throws if a signal with the same ID is already registered. */
  registerSignal(signal: Signal): this;
  /** Registers multiple signals at once. */
  registerSignals(signals: Signal[]): this;
  /** Removes a signal by ID. Returns true if it was found and removed. */
  unregisterSignal(signalId: string): boolean;
  /** Returns a registered signal by ID, or undefined. */
  getSignal(signalId: string): Signal | undefined;
  /** Returns all registered signals. */
  getSignals(): Signal[];
  /** Returns all registered signals that belong to a given category. */
  getSignalsByCategory(category: string): Signal[];

  /**
   * Runs all registered signals concurrently and returns a DetectionResult.
   * Throws if detection is already in progress on this instance.
   */
  detect(options?: { skipInteractionSignals?: boolean }): Promise<DetectionResult>;

  /** Returns the result of the most recent detect() call, or null. */
  getLastDetection(): DetectionResult | null;
  /** Returns the score from the last detect() call, or 0. */
  getScore(): number;
  /** Returns the triggered signal IDs from the last detect() call. */
  getTriggeredSignals(): string[];
  /** True while a detect() call is in progress. */
  isRunning(): boolean;
  /** Resets the detector and all registered signals to their initial state. */
  reset(): void;
  /** Updates thresholds or timeout after construction. */
  configure(options: {
    humanThreshold?: number;
    suspiciousThreshold?: number;
    detectionTimeout?: number;
  }): void;

  /**
   * @deprecated Use createDetector() from '@niksbanna/bot-detector' instead.
   * This method always throws to prevent silent empty-detector bugs.
   */
  static withDefaults(): never;
}

// ── Built-in signal classes ───────────────────────────────────────────────────

// Environment
export declare class WebDriverSignal extends Signal {
  static readonly id: 'webdriver';
  static readonly category: 'environment';
}
export declare class HeadlessSignal extends Signal {
  static readonly id: 'headless';
  static readonly category: 'environment';
}
export declare class NavigatorAnomalySignal extends Signal {
  static readonly id: 'navigator-anomaly';
  static readonly category: 'environment';
}
export declare class PermissionsSignal extends Signal {
  static readonly id: 'permissions';
  static readonly category: 'environment';
}

// Behavioural
export declare class MouseMovementSignal extends Signal {
  static readonly id: 'mouse-movement';
  static readonly category: 'behavior';
  static readonly requiresInteraction: true;
  startTracking(): void;
  stopTracking(): void;
}
export declare class KeyboardPatternSignal extends Signal {
  static readonly id: 'keyboard-pattern';
  static readonly category: 'behavior';
  static readonly requiresInteraction: true;
  startTracking(): void;
  stopTracking(): void;
}
export declare class InteractionTimingSignal extends Signal {
  static readonly id: 'interaction-timing';
  static readonly category: 'behavior';
  static readonly requiresInteraction: true;
  startTracking(): void;
  stopTracking(): void;
}
export declare class ScrollBehaviorSignal extends Signal {
  static readonly id: 'scroll-behavior';
  static readonly category: 'behavior';
  static readonly requiresInteraction: true;
  startTracking(): void;
  stopTracking(): void;
}

// Fingerprint
export declare class PluginsSignal extends Signal {
  static readonly id: 'plugins';
  static readonly category: 'fingerprint';
}
export declare class WebGLSignal extends Signal {
  static readonly id: 'webgl';
  static readonly category: 'fingerprint';
}
export declare class CanvasSignal extends Signal {
  static readonly id: 'canvas';
  static readonly category: 'fingerprint';
}
export declare class AudioContextSignal extends Signal {
  static readonly id: 'audio-context';
  static readonly category: 'fingerprint';
}
export declare class ScreenSignal extends Signal {
  static readonly id: 'screen';
  static readonly category: 'fingerprint';
}

// Timing
export declare class PageLoadSignal extends Signal {
  static readonly id: 'page-load';
  static readonly category: 'timing';
}
export declare class DOMContentTimingSignal extends Signal {
  static readonly id: 'dom-content-timing';
  static readonly category: 'timing';
}

// Automation frameworks
export declare class PuppeteerSignal extends Signal {
  static readonly id: 'puppeteer';
  static readonly category: 'automation';
}
export declare class PlaywrightSignal extends Signal {
  static readonly id: 'playwright';
  static readonly category: 'automation';
}
export declare class SeleniumSignal extends Signal {
  static readonly id: 'selenium';
  static readonly category: 'automation';
}
export declare class PhantomJSSignal extends Signal {
  static readonly id: 'phantomjs';
  static readonly category: 'automation';
}

// ── Namespace of all signal classes ──────────────────────────────────────────

/** All built-in signal classes, keyed by class name. */
export declare const Signals: {
  WebDriverSignal: typeof WebDriverSignal;
  HeadlessSignal: typeof HeadlessSignal;
  NavigatorAnomalySignal: typeof NavigatorAnomalySignal;
  PermissionsSignal: typeof PermissionsSignal;
  MouseMovementSignal: typeof MouseMovementSignal;
  KeyboardPatternSignal: typeof KeyboardPatternSignal;
  InteractionTimingSignal: typeof InteractionTimingSignal;
  ScrollBehaviorSignal: typeof ScrollBehaviorSignal;
  PluginsSignal: typeof PluginsSignal;
  WebGLSignal: typeof WebGLSignal;
  CanvasSignal: typeof CanvasSignal;
  AudioContextSignal: typeof AudioContextSignal;
  ScreenSignal: typeof ScreenSignal;
  PageLoadSignal: typeof PageLoadSignal;
  DOMContentTimingSignal: typeof DOMContentTimingSignal;
  PuppeteerSignal: typeof PuppeteerSignal;
  PlaywrightSignal: typeof PlaywrightSignal;
  SeleniumSignal: typeof SeleniumSignal;
  PhantomJSSignal: typeof PhantomJSSignal;
};

/** All default signal instances (instant + interaction). */
export declare const defaultSignals: Signal[];
/** Default signal instances that run without user interaction. */
export declare const defaultInstantSignals: Signal[];
/** Default signal instances that require user interaction. */
export declare const defaultInteractionSignals: Signal[];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a BotDetector pre-loaded with all built-in signals.
 * This is the recommended entry point for most use cases.
 *
 * @example
 * const detector = createDetector({ humanThreshold: 15, suspiciousThreshold: 40 });
 * const result = await detector.detect();
 */
export declare function createDetector(options?: DetectorOptions): BotDetector;

/**
 * One-shot detection: creates a fresh detector, runs it, and returns the result.
 *
 * @example
 * const result = await detect();
 * if (result.verdict === 'bot') { ... }
 */
export declare function detect(options?: DetectOptions): Promise<DetectionResult>;

/**
 * Runs detection using only instant (non-interaction) signals.
 * Safe to call immediately on page load — does not wait for mouse or keyboard events.
 *
 * @example
 * document.addEventListener('DOMContentLoaded', async () => {
 *   const result = await detectInstant();
 *   console.log(result.verdict);
 * });
 */
export declare function detectInstant(): Promise<DetectionResult>;

/** Default export for environments that prefer a single namespace import. */
declare const _default: {
  BotDetector: typeof BotDetector;
  createDetector: typeof createDetector;
  detect: typeof detect;
  detectInstant: typeof detectInstant;
  Signal: typeof Signal;
  Signals: typeof Signals;
  Verdict: typeof Verdict;
};
export default _default;
