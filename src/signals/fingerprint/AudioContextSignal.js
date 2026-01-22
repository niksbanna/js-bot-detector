/**
 * @fileoverview Detects AudioContext anomalies.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Checks for AudioContext anomalies.
 * Bots and headless browsers often have unusual or missing audio capabilities.
 */
class AudioContextSignal extends Signal {
  static id = 'audio-context';
  static category = 'fingerprint';
  static weight = 0.5;
  static description = 'Detects AudioContext anomalies';

  async detect() {
    const anomalies = [];
    let confidence = 0;

    // Check if AudioContext exists
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    if (!AudioContext) {
      // AudioContext not available
      anomalies.push('audio-context-unavailable');
      confidence = Math.max(confidence, 0.4);
      return this.createResult(true, { anomalies }, confidence);
    }

    let audioContext = null;
    let oscillator = null;
    let analyser = null;

    try {
      audioContext = new AudioContext();
      
      // Check sample rate - unusual values may indicate virtualization
      const sampleRate = audioContext.sampleRate;
      if (sampleRate !== 44100 && sampleRate !== 48000 && sampleRate !== 96000) {
        anomalies.push('unusual-sample-rate');
        confidence = Math.max(confidence, 0.3);
      }

      // Check for suspended state (auto-play policy)
      // This is normal, but combined with other factors can be suspicious

      // Try to create an oscillator and check its properties
      oscillator = audioContext.createOscillator();
      analyser = audioContext.createAnalyser();
      
      if (!oscillator || !analyser) {
        anomalies.push('audio-nodes-unavailable');
        confidence = Math.max(confidence, 0.5);
      } else {
        // Check analyser properties
        const fftSize = analyser.fftSize;
        if (fftSize !== 2048) {
          // Non-default value might indicate tampering
          // but this alone isn't conclusive
        }

        // Check destination
        const destination = audioContext.destination;
        if (!destination || destination.maxChannelCount === 0) {
          anomalies.push('no-audio-destination');
          confidence = Math.max(confidence, 0.6);
        }

        // Check for channel count
        if (destination && destination.maxChannelCount < 2) {
          anomalies.push('mono-audio-only');
          confidence = Math.max(confidence, 0.3);
        }
      }

      // Check for overridden AudioContext
      try {
        const audioCtxStr = AudioContext.toString();
        if (!audioCtxStr.includes('[native code]')) {
          anomalies.push('audio-context-overridden');
          confidence = Math.max(confidence, 0.7);
        }
      } catch (e) {
        // Some environments may throw
      }

      // Audio fingerprint test - create a noise signal and check output
      try {
        if (audioContext.state === 'suspended') {
          // Try to resume (may not work without user gesture)
          await audioContext.resume().catch(() => {});
        }

        // Only perform if we can
        if (audioContext.state === 'running') {
          const oscillatorNode = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const scriptProcessor = audioContext.createScriptProcessor 
            ? audioContext.createScriptProcessor(4096, 1, 1)
            : null;

          if (scriptProcessor) {
            oscillatorNode.type = 'triangle';
            oscillatorNode.frequency.value = 10000;
            gainNode.gain.value = 0;
            
            oscillatorNode.connect(gainNode);
            gainNode.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            // Brief test
            oscillatorNode.start(0);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            oscillatorNode.stop();
            oscillatorNode.disconnect();
            gainNode.disconnect();
            scriptProcessor.disconnect();
          }
        }
      } catch (e) {
        // Audio fingerprinting blocked or failed
        anomalies.push('audio-fingerprint-blocked');
        confidence = Math.max(confidence, 0.4);
      }

      // Check for OfflineAudioContext
      const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OfflineAudioContext) {
        anomalies.push('offline-audio-context-unavailable');
        confidence = Math.max(confidence, 0.3);
      }

    } catch (e) {
      anomalies.push('audio-context-error');
      confidence = Math.max(confidence, 0.4);
    } finally {
      // Clean up
      if (oscillator) {
        try { oscillator.disconnect(); } catch (e) {}
      }
      if (analyser) {
        try { analyser.disconnect(); } catch (e) {}
      }
      if (audioContext) {
        try { audioContext.close(); } catch (e) {}
      }
    }

    const triggered = anomalies.length > 0;

    return this.createResult(triggered, { anomalies }, confidence);
  }
}

export { AudioContextSignal };
