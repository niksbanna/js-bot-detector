# Bot Detector

A production-grade, signal-based JavaScript library for detecting automated browsers and bots. Uses accumulation-based detection where multiple weak signals combine to form strong evidence.

## Features

- 🎯 **Signal-based Detection**: No single check determines bot status
- ⚖️ **Weighted Scoring**: Each signal contributes based on reliability
- 🔌 **Extensible Architecture**: Easy to add custom detection signals
- 🛡️ **Defensive by Default**: Non-blocking, fail-safe checks
- 🔒 **Privacy-Conscious**: No network calls, no persistent storage, no PII
- 📦 **Zero Dependencies**: Pure JavaScript, works in any browser

## Quick Start

### Installation

```bash
npm install @niksbanna/bot-detector
```

### Basic Usage

```javascript
import { detect, detectInstant } from '@niksbanna/bot-detector';

// Quick detection (includes behavioral analysis)
const result = await detect();
console.log(result.verdict); // 'human', 'suspicious', or 'bot'
console.log(result.score);   // 0-100

// Instant detection (no waiting for user interaction)
const instant = await detectInstant();
```

### Custom Configuration

```javascript
import { createDetector } from '@niksbanna/bot-detector';

const detector = createDetector({
  humanThreshold: 15,        // Score < 15 = human
  suspiciousThreshold: 40,   // Score 15-40 = suspicious, >= 40 = bot
  detectionTimeout: 3000,    // Timeout in ms
  includeInteractionSignals: true, // Include mouse/keyboard tracking
});

const result = await detector.detect();
```

### Browser Script Tag

**ESM (recommended):**
```html
<script type="module">
  import { detect } from 'https://cdn.jsdelivr.net/npm/@niksbanna/bot-detector/dist/bot-detector.esm.js';

  const result = await detect();
  if (result.verdict === 'bot') {
    // Handle bot detection
  }
</script>
```

**Classic script tag (IIFE):**
```html
<!-- Full build -->
<script src="https://cdn.jsdelivr.net/npm/@niksbanna/bot-detector/dist/bot-detector.iife.js"></script>
<!-- Minified -->
<script src="https://cdn.jsdelivr.net/npm/@niksbanna/bot-detector/dist/bot-detector.iife.min.js"></script>
<script>
  BotDetectorLib.detect().then(result => {
    if (result.verdict === 'bot') {
      // Handle bot detection
    }
  });
</script>
```

**Named subpath imports (bundlers / Node.js):**
```javascript
// Full IIFE source
import '@niksbanna/bot-detector/iife';
// Minified IIFE source
import '@niksbanna/bot-detector/iife.min';
```

## Detection Result

```typescript
interface DetectionResult {
  verdict: 'human' | 'suspicious' | 'bot';
  score: number;           // 0-100 bot probability score
  confidence: string;      // 'low', 'medium', or 'high'
  reason: string;          // Human-readable explanation
  triggeredSignals: string[]; // Array of triggered signal IDs
  signals: object;         // Detailed results per signal
  detectionTimeMs: number; // Detection duration
  totalSignals: number;    // Total signals evaluated
}
```

## Signal Categories

### Environment Signals
Detect automation environment indicators:
- `webdriver` - Detects `navigator.webdriver` flag
- `headless` - Detects headless browser indicators
- `navigator-anomaly` - Detects navigator property inconsistencies
- `permissions` - Detects Permissions API anomalies

### Behavioral Signals
Detect non-human interaction patterns:
- `mouse-movement` - Tracks mouse patterns (linear paths, teleportation)
- `keyboard-pattern` - Analyzes keystroke timing
- `interaction-timing` - Measures time to first interaction
- `scroll-behavior` - Detects programmatic scrolling

### Fingerprint Signals
Detect inconsistent browser features:
- `plugins` - Checks for empty/suspicious plugin lists
- `webgl` - Detects WebGL rendering anomalies
- `canvas` - Detects canvas fingerprint blocking
- `audio-context` - Checks AudioContext anomalies
- `screen` - Detects unusual screen dimensions

### Timing Signals
Detect automation execution patterns:
- `page-load` - Analyzes page load timing
- `dom-content-timing` - Analyzes DOM ready patterns

### Automation Framework Signals
Detect specific automation tools:
- `puppeteer` - Detects Puppeteer artifacts
- `playwright` - Detects Playwright artifacts
- `selenium` - Detects Selenium WebDriver
- `phantomjs` - Detects PhantomJS

## Custom Signals

Create your own detection signals:

```javascript
import { Signal, BotDetector } from '@niksbanna/bot-detector';

class CustomSignal extends Signal {
  static id = 'my-custom-signal';
  static category = 'custom';
  static weight = 0.7; // 0.1 to 1.0
  static description = 'Detects custom bot behavior';

  async detect() {
    const suspicious = /* your detection logic */;
    const evidence = { /* any data to include */ };
    const confidence = 0.8; // 0 to 1
    
    return this.createResult(suspicious, evidence, confidence);
  }
}

const detector = new BotDetector();
detector.registerSignal(new CustomSignal());
const result = await detector.detect();
```

## Scoring System

The final score is calculated as:

```
score = Σ(signal.weight × signal.confidence × triggered) / Σ(signal.weight) × 100
```

Where:
- `weight`: Signal importance (0.1 to 1.0)
- `confidence`: Detection certainty (0 to 1)  
- `triggered`: 1 if detected, 0 otherwise

### Verdict Thresholds

| Score | Verdict |
|-------|---------|
| < 20 | `human` |
| 20-50 | `suspicious` |
| ≥ 50 | `bot` |

## API Reference

### Functions

#### `detect(options?)`
Run full detection with all signals.

#### `detectInstant()`
Run detection without waiting for interaction signals.

#### `createDetector(options?)`
Create a configured detector instance.

### Classes

#### `BotDetector`
Main orchestrator class.

```javascript
const detector = new BotDetector(options);
detector.registerSignal(signal);  // Add signal
detector.unregisterSignal(id);    // Remove signal
await detector.detect();          // Run detection
detector.getScore();              // Get last score
detector.reset();                 // Reset state
```

#### `Signal`
Base class for detection signals. Extend this to create custom signals.

### Options

```javascript
{
  humanThreshold: 20,              // Score below = human
  suspiciousThreshold: 50,         // Score above = bot
  detectionTimeout: 5000,          // Max detection time (ms)
  includeInteractionSignals: true, // Include behavioral signals
  weightOverrides: {               // Override signal weights
    'webdriver': 0.5,
  },
  instantBotSignals: [             // Signals that instantly flag as bot
    'webdriver',
    'puppeteer',
  ],
}
```

## Security Considerations

⚠️ **Important**: This library is for client-side detection only. It should be used as one layer in a defense-in-depth strategy.

1. **Evasion is possible**: Sophisticated bots can spoof signals
2. **Server-side validation**: Always validate critical actions server-side
3. **Rate limiting**: Combine with server-side rate limiting
4. **Obfuscation**: Consider obfuscating detection code in production

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Changelog

### v1.0.3
- **Stability Fixes:** 
  - Fixed a major memory leak where `setTimeout` timers were never cleared in `BotDetector.detect()`.
  - Fixed `getBreakdown()` calling `calculate()` in an $O(n^2)$ loop; now computes instantly ($O(n)$).
  - Fixed an issue where multiple `BotDetector` instances on the same page shared mutable singleton state. `createDetector()` now guarantees fresh detection instances.
  - `BotDetector.withDefaults()` now throws a descriptive error pointing to `createDetector()` instead of silently breaking and returning a useless detector.
  - Capped tracking duration of all behavior signals (`MouseMovementSignal`, `KeyboardPatternSignal`, `ScrollBehaviorSignal`) at `2500ms` so they safely fit within the default `5000ms` global timeout without non-deterministic racing.
- **False-Positive Fixes:**
  - `PuppeteerSignal` & `HeadlessSignal`: Fixed a critical bug where `window.chrome.runtime` being undefined caused a false positive for all standard, non-extension Chrome users.
  - `NavigatorAnomalySignal`: Chrome 110+ user-agent reduction returns `''` for `navigator.platform`; this is now correctly handled as normal behavior on Chrome.
  - `PuppeteerSignal`: Increased `suspiciousBindings` threshold and excluded React, Webpack, Vite, Nuxt, and Next.js global prefixes to avoid false positives on heavy framework sites.
  - `PageLoadSignal`: Fixed a "negative-timing" false positive caused by evaluating performance metrics before events had fired (zero epoch bug).
  - `PageLoadSignal`: Fixed a "frozen-performance" false positive caused by the browser's deliberate Spectre timer quantization (1-2ms).
- **Correctness Fixes:**
  - Removed redundant `navigator.webdriver` checks from `PuppeteerSignal`, `PlaywrightSignal`, and `SeleniumSignal` to prevent triple-counting the same underlying signal; this check is now exclusively handled by `WebDriverSignal`.
  - `PhantomJSSignal`: Cleaned up dead code evaluating `Buffer` and `process`.
  - `DOMContentTimingSignal`: Randomized the ID of the injected test div to prevent detection scripts from keying off the hardcoded `__bot_detection_test__` id.
- **Examples:** Fixed CORS issues with `file://` protocol in demo HTML files by utilizing the IIFE build instead of ESM imports.

### v1.0.2
- **Fix:** `PuppeteerSignal` no longer false-positives on Angular apps — `__zone_symbol__*` bindings injected by Zone.js are now excluded from the suspicious-bindings check.
- **Fix:** `PuppeteerSignal` no longer false-positives on normal Chrome pages — `incomplete-chrome-object` now only triggers when `window.chrome.runtime` is absent, not when `runtime.id` is undefined (which is normal outside of extensions).
- **Fix:** Corrected `package.json` `browser` entry to point to ESM instead of IIFE, fixing import resolution in modern bundlers (Vite, webpack, Rollup, esbuild).
- **Added:** Named export subpaths `./iife` and `./iife.min` for explicit IIFE access.

### v1.0.0
- Initial release.

## License

MIT
