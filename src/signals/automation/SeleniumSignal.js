/**
 * @fileoverview Detects Selenium WebDriver artifacts.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects artifacts left by Selenium WebDriver.
 * Selenium leaves various fingerprints in the browser context.
 */
class SeleniumSignal extends Signal {
  static id = 'selenium';
  static category = 'automation';
  static weight = 1.0;
  static description = 'Detects Selenium WebDriver artifacts';

  async detect() {
    const indicators = [];
    let confidence = 0;

    // Check for navigator.webdriver (standard WebDriver flag)
    if (navigator.webdriver === true) {
      indicators.push('webdriver-flag');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for Selenium-specific globals
    const seleniumGlobals = [
      '_selenium',
      'callSelenium',
      '_Selenium_IDE_Recorder',
      '__selenium_evaluate',
      '__selenium_unwrap',
      '__webdriver_evaluate',
      '__webdriver_unwrap',
      '__webdriver_script_function',
      '__webdriver_script_func',
      '__fxdriver_evaluate',
      '__fxdriver_unwrap',
      'webdriver',
    ];

    for (const global of seleniumGlobals) {
      if (global in window) {
        indicators.push(`global-${global}`);
        confidence = Math.max(confidence, 1.0);
      }
    }

    // Check for Selenium document properties
    const seleniumDocProps = [
      '__webdriver_script_fn',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrap',
      '__webdriver_unwrap',
      '__selenium_unwrap',
      '__fxdriver_unwrap',
    ];

    for (const prop of seleniumDocProps) {
      if (prop in document) {
        indicators.push(`document-${prop}`);
        confidence = Math.max(confidence, 1.0);
      }
    }

    // Check for ChromeDriver artifacts ($cdc variables)
    const windowKeys = Object.keys(window);
    
    // ChromeDriver injects variables starting with $cdc_ or $wdc_
    const cdcVars = windowKeys.filter(key => 
      key.startsWith('$cdc_') || 
      key.startsWith('$wdc_') ||
      key.startsWith('$chrome_asyncScriptInfo')
    );

    if (cdcVars.length > 0) {
      indicators.push('chromedriver-variables');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for GeckoDriver (Firefox) artifacts
    if (window.webdriverCallback || document.documentElement.getAttribute('webdriver')) {
      indicators.push('geckodriver-artifacts');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for webdriver in document element attributes
    try {
      const docElement = document.documentElement;
      if (docElement.hasAttribute('webdriver') || 
          docElement.getAttribute('selenium') ||
          docElement.getAttribute('driver')) {
        indicators.push('document-webdriver-attr');
        confidence = Math.max(confidence, 1.0);
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for Selenium IDE artifacts
    if (window.selenium || window.sideex) {
      indicators.push('selenium-ide');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for navigator.webdriver property descriptor anomalies
    try {
      const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
      if (descriptor) {
        // Check if the getter has been modified
        if (descriptor.get) {
          const getterStr = descriptor.get.toString();
          if (!getterStr.includes('[native code]')) {
            indicators.push('webdriver-getter-modified');
            confidence = Math.max(confidence, 0.7);
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for driver command executor
    if (window.domAutomation || window.domAutomationController) {
      indicators.push('dom-automation');
      confidence = Math.max(confidence, 1.0);
    }

    // Check for callPhantom alternative used by some Selenium setups
    if (window.awesomium) {
      indicators.push('awesomium');
      confidence = Math.max(confidence, 0.9);
    }

    // Check for external interface (used by some automation tools)
    if (window.external && window.external.toString().includes('Selenium')) {
      indicators.push('external-selenium');
      confidence = Math.max(confidence, 1.0);
    }

    const triggered = indicators.length > 0;

    return this.createResult(triggered, { indicators }, confidence);
  }
}

export { SeleniumSignal };
