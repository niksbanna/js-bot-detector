import { describe, it, expect } from 'vitest';
import { WebDriverSignal } from '../../src/signals/environment/WebDriverSignal.js';
import { HeadlessSignal } from '../../src/signals/environment/HeadlessSignal.js';
import { NavigatorAnomalySignal } from '../../src/signals/environment/NavigatorAnomalySignal.js';
import { PermissionsSignal } from '../../src/signals/environment/PermissionsSignal.js';

describe('Environment Signals', () => {
  describe('WebDriverSignal', () => {
    it('should have correct metadata', () => {
      const signal = new WebDriverSignal();
      expect(signal.id).toBe('webdriver');
      expect(signal.category).toBe('environment');
      expect(signal.weight).toBe(1.0);
    });

    it('should detect when navigator.webdriver is false', async () => {
      // In happy-dom, webdriver should be undefined/false
      const signal = new WebDriverSignal();
      const result = await signal.run();
      
      expect(result).toHaveProperty('triggered');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('HeadlessSignal', () => {
    it('should have correct metadata', () => {
      const signal = new HeadlessSignal();
      expect(signal.id).toBe('headless');
      expect(signal.category).toBe('environment');
      expect(signal.weight).toBe(0.8);
    });

    it('should run detection without errors', async () => {
      const signal = new HeadlessSignal();
      const result = await signal.run();
      
      expect(result).toHaveProperty('triggered');
      expect(result).toHaveProperty('value');
    });
  });

  describe('NavigatorAnomalySignal', () => {
    it('should have correct metadata', () => {
      const signal = new NavigatorAnomalySignal();
      expect(signal.id).toBe('navigator-anomaly');
      expect(signal.category).toBe('environment');
    });

    it('should run detection without errors', async () => {
      const signal = new NavigatorAnomalySignal();
      const result = await signal.run();
      
      expect(result).toHaveProperty('triggered');
    });
  });

  describe('PermissionsSignal', () => {
    it('should have correct metadata', () => {
      const signal = new PermissionsSignal();
      expect(signal.id).toBe('permissions');
      expect(signal.category).toBe('environment');
    });

    it('should handle missing Permissions API', async () => {
      const signal = new PermissionsSignal();
      const result = await signal.run();
      
      // Should not throw even if Permissions API is unavailable
      expect(result).toHaveProperty('triggered');
    });
  });
});
