/**
 * @fileoverview Detects canvas fingerprint blocking or spoofing.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects canvas manipulation, blocking, or spoofing.
 * Privacy tools and some bots modify canvas output.
 */
class CanvasSignal extends Signal {
  static id = 'canvas';
  static category = 'fingerprint';
  static weight = 0.5;
  static description = 'Detects canvas fingerprint anomalies';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        anomalies.push('canvas-context-unavailable');
        confidence = Math.max(confidence, 0.5);
        return this.createResult(true, { anomalies }, confidence);
      }

      // Draw a complex pattern for fingerprinting
      ctx.textBaseline = 'alphabetic';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('Bot Detection Test 🤖', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Canvas Fingerprint', 4, 30);
      
      // Add some complex graphics
      ctx.beginPath();
      ctx.arc(100, 25, 10, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      // Get data URL
      const dataUrl1 = canvas.toDataURL();

      // Draw again - should produce same result
      ctx.clearRect(0, 0, 200, 50);
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('Bot Detection Test 🤖', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Canvas Fingerprint', 4, 30);
      ctx.beginPath();
      ctx.arc(100, 25, 10, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      const dataUrl2 = canvas.toDataURL();

      // If results differ, canvas is being randomized (privacy protection)
      if (dataUrl1 !== dataUrl2) {
        anomalies.push('canvas-randomized');
        confidence = Math.max(confidence, 0.6);
      }

      // Check for blank canvas (blocking)
      if (dataUrl1.length < 1000) {
        anomalies.push('canvas-possibly-blank');
        confidence = Math.max(confidence, 0.4);
      }

      // Check for common blocked canvas signature
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = 200;
      blankCanvas.height = 50;
      const blankUrl = blankCanvas.toDataURL();
      
      if (dataUrl1 === blankUrl) {
        anomalies.push('canvas-rendering-blocked');
        confidence = Math.max(confidence, 0.7);
      }

      // Check for toDataURL being overridden
      try {
        const toDataURLStr = canvas.toDataURL.toString();
        if (!toDataURLStr.includes('[native code]')) {
          anomalies.push('toDataURL-overridden');
          confidence = Math.max(confidence, 0.8);
        }
      } catch (e) {
        // Some environments may throw
      }

      // Check pixel data directly
      const imageData = ctx.getImageData(0, 0, 200, 50);
      const pixels = imageData.data;
      
      // Check if all pixels are the same (completely blocked)
      let allSame = true;
      const firstPixel = [pixels[0], pixels[1], pixels[2], pixels[3]];
      for (let i = 4; i < pixels.length; i += 4) {
        if (pixels[i] !== firstPixel[0] || 
            pixels[i+1] !== firstPixel[1] || 
            pixels[i+2] !== firstPixel[2]) {
          allSame = false;
          break;
        }
      }
      
      if (allSame) {
        anomalies.push('uniform-pixel-data');
        confidence = Math.max(confidence, 0.6);
      }

    } catch (e) {
      anomalies.push('canvas-error');
      confidence = Math.max(confidence, 0.4);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, { anomalies }, confidence);
  }
}

export { CanvasSignal };
