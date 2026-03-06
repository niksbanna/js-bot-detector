import { describe, it, expect, beforeEach } from 'vitest';
import { BotDetector } from '../src/core/BotDetector.js';
import { Signal } from '../src/core/Signal.js';
import { ScoringEngine } from '../src/core/ScoringEngine.js';
import { VerdictEngine, Verdict } from '../src/core/VerdictEngine.js';

describe('BotDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BotDetector();
  });

  it('should create a detector instance', () => {
    expect(detector).toBeInstanceOf(BotDetector);
  });

  it('should register a signal', () => {
    class TestSignal extends Signal {
      static id = 'test-signal';
      static category = 'test';
      static weight = 0.5;
      
      async detect() {
        return this.createResult(false);
      }
    }

    detector.registerSignal(new TestSignal());
    expect(detector.getSignal('test-signal')).toBeDefined();
  });

  it('should throw when registering duplicate signal', () => {
    class TestSignal extends Signal {
      static id = 'duplicate-signal';
      async detect() {
        return this.createResult(false);
      }
    }

    detector.registerSignal(new TestSignal());
    expect(() => detector.registerSignal(new TestSignal())).toThrow();
  });

  it('should run detection and return result', async () => {
    class PassingSignal extends Signal {
      static id = 'passing';
      static weight = 1.0;
      async detect() {
        return this.createResult(false, null, 0);
      }
    }

    detector.registerSignal(new PassingSignal());
    const result = await detector.detect();

    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('confidence');
    expect(result.verdict).toBe('human');
  });

  it('should detect bot when signal is triggered', async () => {
    class BotSignal extends Signal {
      static id = 'bot-indicator';
      static weight = 1.0;
      async detect() {
        return this.createResult(true, { reason: 'test' }, 1.0);
      }
    }

    detector.registerSignal(new BotSignal());
    const result = await detector.detect();

    expect(result.verdict).toBe('bot');
    expect(result.score).toBe(100);
    expect(result.triggeredSignals).toContain('bot-indicator');
  });
});

describe('ScoringEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ScoringEngine();
  });

  it('should calculate score of 0 with no results', () => {
    expect(engine.calculate()).toBe(0);
  });

  it('should calculate correct score for triggered signal', () => {
    engine.addResult('test', { triggered: true, confidence: 1.0 }, 1.0);
    expect(engine.calculate()).toBe(100);
  });

  it('should calculate weighted score', () => {
    engine.addResult('signal1', { triggered: true, confidence: 1.0 }, 0.5);
    engine.addResult('signal2', { triggered: false, confidence: 0 }, 0.5);
    expect(engine.calculate()).toBe(50);
  });

  it('should respect weight overrides', () => {
    const engineWithOverrides = new ScoringEngine({
      weightOverrides: { 'test': 0.2 }
    });
    expect(engineWithOverrides.getWeight('test', 1.0)).toBe(0.2);
  });

  it('should track triggered signals', () => {
    engine.addResult('triggered', { triggered: true, confidence: 1.0 }, 1.0);
    engine.addResult('not-triggered', { triggered: false, confidence: 0 }, 1.0);
    
    const triggered = engine.getTriggeredSignals();
    expect(triggered).toContain('triggered');
    expect(triggered).not.toContain('not-triggered');
  });
});

describe('VerdictEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new VerdictEngine();
  });

  it('should return human verdict for low score', () => {
    const result = engine.getVerdict(10, []);
    expect(result.verdict).toBe(Verdict.HUMAN);
  });

  it('should return suspicious verdict for medium score', () => {
    const result = engine.getVerdict(35, []);
    expect(result.verdict).toBe(Verdict.SUSPICIOUS);
  });

  it('should return bot verdict for high score', () => {
    const result = engine.getVerdict(75, []);
    expect(result.verdict).toBe(Verdict.BOT);
  });

  it('should return bot for instant bot signals', () => {
    const engineWithInstant = new VerdictEngine({
      instantBotSignals: ['webdriver']
    });
    
    const result = engineWithInstant.getVerdict(10, ['webdriver']);
    expect(result.verdict).toBe(Verdict.BOT);
  });

  it('should return a score consistent with bot verdict when instant bot signal fires with low raw score', () => {
    // Reproduces: score 7.61, verdict "bot" (triggered signals: headless, page-load, puppeteer)
    // The raw score (7.61) would normally map to "human", but the instant bot signal
    // overrides the verdict to "bot". The returned score must be >= suspiciousThreshold
    // so that score and verdict are internally consistent.
    const engineWithInstant = new VerdictEngine({
      instantBotSignals: ['puppeteer'],
    });

    const result = engineWithInstant.getVerdict(7.61, ['headless', 'page-load', 'puppeteer']);
    expect(result.verdict).toBe(Verdict.BOT);
    expect(result.score).toBeGreaterThanOrEqual(VerdictEngine.DEFAULT_THRESHOLDS.suspicious);
  });

  it('should preserve a high score when instant bot signal fires with score already above bot threshold', () => {
    const engineWithInstant = new VerdictEngine({
      instantBotSignals: ['puppeteer'],
    });

    const result = engineWithInstant.getVerdict(80, ['puppeteer']);
    expect(result.verdict).toBe(Verdict.BOT);
    expect(result.score).toBe(80);
  });

  it('should use custom suspiciousThreshold as the floor score when instant bot signal fires', () => {
    const engineWithInstant = new VerdictEngine({
      instantBotSignals: ['selenium'],
      suspiciousThreshold: 40,
    });

    const result = engineWithInstant.getVerdict(5, ['selenium']);
    expect(result.verdict).toBe(Verdict.BOT);
    expect(result.score).toBe(40);
  });

  it('should respect custom thresholds', () => {
    const customEngine = new VerdictEngine({
      humanThreshold: 10,
      suspiciousThreshold: 30
    });
    
    expect(customEngine.getVerdict(15, []).verdict).toBe(Verdict.SUSPICIOUS);
    expect(customEngine.getVerdict(35, []).verdict).toBe(Verdict.BOT);
  });
});

describe('Signal', () => {
  it('should create result with defaults', () => {
    class TestSignal extends Signal {
      static id = 'test';
      async detect() {
        return this.createResult(true);
      }
    }

    const signal = new TestSignal();
    const result = signal.createResult(true, { data: 'test' }, 0.8);
    
    expect(result.triggered).toBe(true);
    expect(result.value).toEqual({ data: 'test' });
    expect(result.confidence).toBe(0.8);
  });

  it('should clamp confidence between 0 and 1', () => {
    class TestSignal extends Signal {
      static id = 'test';
      async detect() {
        return this.createResult(true);
      }
    }

    const signal = new TestSignal();
    
    expect(signal.createResult(true, null, 1.5).confidence).toBe(1);
    expect(signal.createResult(true, null, -0.5).confidence).toBe(0);
  });

  it('should handle errors gracefully in run()', async () => {
    class ErrorSignal extends Signal {
      static id = 'error';
      async detect() {
        throw new Error('Test error');
      }
    }

    const signal = new ErrorSignal();
    const result = await signal.run();
    
    expect(result.triggered).toBe(false);
    expect(result.error).toBe('Test error');
  });
});
