/**
 * @fileoverview Detects browser plugin anomalies.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Checks for empty or suspicious plugin configurations.
 * Headless browsers and bots often have no plugins.
 */
class PluginsSignal extends Signal {
  static id = 'plugins';
  static category = 'fingerprint';
  static weight = 0.6;
  static description = 'Detects browser plugin anomalies';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    const plugins = navigator.plugins;
    const mimeTypes = navigator.mimeTypes;

    // Check if plugins exists
    if (!plugins) {
      anomalies.push('no-plugins-object');
      confidence = Math.max(confidence, 0.6);
      return this.createResult(true, { anomalies }, confidence);
    }

    // Check for empty plugins array
    if (plugins.length === 0) {
      anomalies.push('empty-plugins');
      confidence = Math.max(confidence, 0.5);
    }

    // Check for Chrome-specific plugins in Chrome browser
    const ua = navigator.userAgent || '';
    if (ua.includes('Chrome') && !ua.includes('Chromium')) {
      // Real Chrome typically has at least these plugins
      const hasChromePdf = Array.from(plugins).some(p => 
        p.name.includes('PDF') || p.name.includes('Chromium PDF'));
      
      if (!hasChromePdf && plugins.length === 0) {
        anomalies.push('chrome-missing-pdf-plugin');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check for consistent plugin/mimeType relationship
    if (plugins.length > 0 && mimeTypes) {
      let totalMimeTypes = 0;
      for (let i = 0; i < plugins.length; i++) {
        totalMimeTypes += plugins[i].length || 0;
      }

      // Plugins exist but no mimeTypes
      if (mimeTypes.length === 0 && totalMimeTypes > 0) {
        anomalies.push('mimetypes-mismatch');
        confidence = Math.max(confidence, 0.5);
      }
    }

    // Check for identical plugin names (sign of spoofing)
    if (plugins.length > 1) {
      const names = Array.from(plugins).map(p => p.name);
      const uniqueNames = new Set(names);
      if (uniqueNames.size < names.length) {
        anomalies.push('duplicate-plugins');
        confidence = Math.max(confidence, 0.6);
      }
    }

    // Check for plugin array tampering
    try {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'plugins');
      if (desc && desc.get) {
        // Check if it's been overridden
        const nativeToString = desc.get.toString();
        if (!nativeToString.includes('[native code]')) {
          anomalies.push('plugins-getter-overridden');
          confidence = Math.max(confidence, 0.7);
        }
      }
    } catch (e) {
      // Ignore errors during introspection
    }

    // Check for suspiciously few plugins in a desktop browser
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    if (!isMobile && plugins.length === 1) {
      anomalies.push('minimal-plugins');
      confidence = Math.max(confidence, 0.3);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      pluginCount: plugins.length,
      mimeTypeCount: mimeTypes?.length || 0,
    }, confidence);
  }
}

export { PluginsSignal };
