/**
 * @fileoverview Detects WebGL rendering anomalies.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects WebGL anomalies and spoofed renderer information.
 * Bots often have missing, disabled, or fake WebGL contexts.
 */
class WebGLSignal extends Signal {
  static id = 'webgl';
  static category = 'fingerprint';
  static weight = 0.7;
  static description = 'Detects WebGL rendering anomalies';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Try to get WebGL context
    const canvas = document.createElement('canvas');
    let gl = null;

    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
      anomalies.push('webgl-error');
      confidence = Math.max(confidence, 0.5);
    }

    if (!gl) {
      // WebGL not available - could be disabled or blocked
      anomalies.push('webgl-unavailable');
      confidence = Math.max(confidence, 0.4);
      return this.createResult(true, { anomalies }, confidence);
    }

    // Get renderer info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendor = '';
    let renderer = '';

    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }

    // Check for empty renderer info (common in headless)
    if (!vendor && !renderer) {
      anomalies.push('no-webgl-renderer-info');
      confidence = Math.max(confidence, 0.6);
    }

    // Check for known headless/virtual renderer strings
    const suspiciousRenderers = [
      'swiftshader',
      'llvmpipe',
      'software',
      'mesa',
      'google swiftshader',
      'vmware',
      'virtualbox',
    ];

    const rendererLower = renderer.toLowerCase();
    for (const sus of suspiciousRenderers) {
      if (rendererLower.includes(sus)) {
        anomalies.push(`suspicious-renderer-${sus.replace(/\s+/g, '-')}`);
        confidence = Math.max(confidence, 0.7);
        break;
      }
    }

    // Check for mismatched vendor/renderer
    if (vendor && renderer) {
      // NVIDIA renderer should have NVIDIA vendor
      if (rendererLower.includes('nvidia') && !vendor.toLowerCase().includes('nvidia')) {
        anomalies.push('vendor-renderer-mismatch');
        confidence = Math.max(confidence, 0.6);
      }
      // AMD renderer should have AMD/ATI vendor
      if ((rendererLower.includes('amd') || rendererLower.includes('radeon')) && 
          !vendor.toLowerCase().includes('amd') && !vendor.toLowerCase().includes('ati')) {
        anomalies.push('vendor-renderer-mismatch');
        confidence = Math.max(confidence, 0.6);
      }
    }

    // Check for supported extensions
    const extensions = gl.getSupportedExtensions() || [];
    
    // Suspiciously few extensions
    if (extensions.length < 5) {
      anomalies.push('few-webgl-extensions');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for WebGL parameter consistency
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

    // Unrealistic values
    if (maxTextureSize < 1024 || maxTextureSize > 65536) {
      anomalies.push('unrealistic-max-texture');
      confidence = Math.max(confidence, 0.5);
    }

    // Check if WebGL rendering actually works
    try {
      // Simple render test
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      const pixels = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // If clear didn't work, something's wrong
      if (pixels[3] !== 255) {
        anomalies.push('webgl-render-failure');
        confidence = Math.max(confidence, 0.6);
      }
    } catch (e) {
      anomalies.push('webgl-render-error');
      confidence = Math.max(confidence, 0.5);
    }

    // Clean up
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      vendor,
      renderer,
      extensionCount: extensions.length,
      maxTextureSize,
    }, confidence);
  }
}

export { WebGLSignal };
