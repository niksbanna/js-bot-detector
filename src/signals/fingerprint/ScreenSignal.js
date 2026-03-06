/**
 * @fileoverview Detects unusual screen and window dimensions.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects screen dimension anomalies.
 * Bots and headless browsers often have unusual screen configurations.
 */
class ScreenSignal extends Signal {
  static id = 'screen';
  static category = 'fingerprint';
  static weight = 0.4;
  static description = 'Detects unusual screen dimensions';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    const screen = window.screen;
    if (!screen) {
      anomalies.push('no-screen-object');
      confidence = Math.max(confidence, 0.6);
      return this.createResult(true, { anomalies }, confidence);
    }

    const width = screen.width;
    const height = screen.height;
    const availWidth = screen.availWidth;
    const availHeight = screen.availHeight;
    const colorDepth = screen.colorDepth;
    const pixelDepth = screen.pixelDepth;
    const outerWidth = window.outerWidth;
    const outerHeight = window.outerHeight;
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    // Check for zero dimensions (headless indicator)
    if (outerWidth === 0 || outerHeight === 0) {
      anomalies.push('zero-outer-dimensions');
      confidence = Math.max(confidence, 0.8);
    }

    if (innerWidth === 0 || innerHeight === 0) {
      anomalies.push('zero-inner-dimensions');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for very small screen (unrealistic for desktop)
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    
    if (!isMobile && (width < 640 || height < 480)) {
      anomalies.push('very-small-screen');
      confidence = Math.max(confidence, 0.5);
    }

    // Check for very large screen (unrealistic)
    if (width > 7680 || height > 4320) { // Beyond 8K
      anomalies.push('unrealistic-screen-size');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for common headless default dimensions
    const headlessDefaults = [
      { w: 800, h: 600 },
      { w: 1024, h: 768 },
      { w: 1920, h: 1080 },
    ];

    for (const def of headlessDefaults) {
      if (width === def.w && height === def.h && 
          outerWidth === def.w && outerHeight === def.h) {
        // Exact match with no browser chrome - suspicious
        anomalies.push('headless-default-dimensions');
        confidence = Math.max(confidence, 0.5);
        break;
      }
    }

    // Check for screen larger than available (impossible)
    if (availWidth > width || availHeight > height) {
      anomalies.push('available-exceeds-total');
      confidence = Math.max(confidence, 0.7);
    }

    // Check for window larger than screen
    if (outerWidth > width || outerHeight > height) {
      anomalies.push('window-exceeds-screen');
      confidence = Math.max(confidence, 0.6);
    }

    // Check for unusual color depth
    if (colorDepth !== 24 && colorDepth !== 32 && colorDepth !== 30 && colorDepth !== 48) {
      anomalies.push('unusual-color-depth');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for mismatched color/pixel depth
    if (colorDepth !== pixelDepth) {
      anomalies.push('depth-mismatch');
      confidence = Math.max(confidence, 0.3);
    }

    // Check for device pixel ratio anomalies
    const dpr = window.devicePixelRatio;
    if (dpr === 0 || dpr === undefined) {
      anomalies.push('missing-device-pixel-ratio');
      confidence = Math.max(confidence, 0.5);
    } else if (dpr < 0.5 || dpr > 5) {
      anomalies.push('unusual-device-pixel-ratio');
      confidence = Math.max(confidence, 0.4);
    }

    // Check for screen orientation API anomalies
    if (screen.orientation) {
      const orientationType = screen.orientation.type;
      
      // Landscape device with portrait dimensions
      if (orientationType.includes('landscape') && width < height) {
        anomalies.push('orientation-dimension-mismatch');
        confidence = Math.max(confidence, 0.4);
      }
      
      // Portrait device with landscape dimensions
      if (orientationType.includes('portrait') && width > height) {
        anomalies.push('orientation-dimension-mismatch');
        confidence = Math.max(confidence, 0.4);
      }
    }

    // Check for innerWidth/Height being exactly equal to outer (no browser chrome)
    if (innerWidth === outerWidth && innerHeight === outerHeight && 
        outerWidth > 0 && outerHeight > 0) {
      anomalies.push('no-browser-chrome');
      confidence = Math.max(confidence, 0.5);
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, {
      anomalies,
      dimensions: {
        screen: { width, height },
        available: { width: availWidth, height: availHeight },
        window: { outer: { width: outerWidth, height: outerHeight }, 
                  inner: { width: innerWidth, height: innerHeight } },
        colorDepth,
        devicePixelRatio: dpr,
      },
    }, confidence);
  }
}

export { ScreenSignal };
