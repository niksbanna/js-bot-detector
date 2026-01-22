import { describe, it, expect } from 'vitest';
import {
  BotDetector,
  Signal,
  Signals,
  Verdict,
  createDetector,
  detect,
  detectInstant,
} from '../src/index.js';

describe('Main Exports', () => {
  it('should export BotDetector class', () => {
    expect(BotDetector).toBeDefined();
    expect(new BotDetector()).toBeInstanceOf(BotDetector);
  });

  it('should export Signal base class', () => {
    expect(Signal).toBeDefined();
  });

  it('should export Verdict enum', () => {
    expect(Verdict).toBeDefined();
    expect(Verdict.HUMAN).toBe('human');
    expect(Verdict.SUSPICIOUS).toBe('suspicious');
    expect(Verdict.BOT).toBe('bot');
  });

  it('should export all signal classes', () => {
    expect(Signals).toBeDefined();
    expect(Signals.WebDriverSignal).toBeDefined();
    expect(Signals.HeadlessSignal).toBeDefined();
    expect(Signals.PuppeteerSignal).toBeDefined();
    expect(Signals.MouseMovementSignal).toBeDefined();
    expect(Signals.CanvasSignal).toBeDefined();
  });

  it('should export createDetector function', () => {
    expect(createDetector).toBeDefined();
    expect(typeof createDetector).toBe('function');
  });

  it('should export detect function', () => {
    expect(detect).toBeDefined();
    expect(typeof detect).toBe('function');
  });

  it('should export detectInstant function', () => {
    expect(detectInstant).toBeDefined();
    expect(typeof detectInstant).toBe('function');
  });
});

describe('createDetector', () => {
  it('should create a detector with default signals', () => {
    const detector = createDetector();
    expect(detector).toBeInstanceOf(BotDetector);
    expect(detector.getSignals().length).toBeGreaterThan(0);
  });

  it('should respect includeInteractionSignals option', () => {
    const withInteraction = createDetector({ includeInteractionSignals: true });
    const withoutInteraction = createDetector({ includeInteractionSignals: false });
    
    expect(withInteraction.getSignals().length).toBeGreaterThan(
      withoutInteraction.getSignals().length
    );
  });

  it('should pass thresholds to detector', () => {
    const detector = createDetector({
      humanThreshold: 15,
      suspiciousThreshold: 40,
    });
    
    expect(detector).toBeInstanceOf(BotDetector);
  });
});

describe('Integration', () => {
  it('should run full detection flow', async () => {
    const detector = createDetector({ includeInteractionSignals: false });
    const result = await detector.detect();

    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('triggeredSignals');
    expect(result).toHaveProperty('detectionTimeMs');
    expect(['human', 'suspicious', 'bot']).toContain(result.verdict);
  });

  it('should run detectInstant without errors', async () => {
    const result = await detectInstant();
    
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('score');
  });
});
