/**
 * @fileoverview Detects permissions API anomalies.
 */

import { Signal } from '../../core/Signal.js';

/**
 * Detects anomalies in the Permissions API.
 * Automation tools often have inconsistent permission states.
 */
class PermissionsSignal extends Signal {
  static id = 'permissions';
  static category = 'environment';
  static weight = 0.5;
  static description = 'Detects Permissions API anomalies';

  async detect() {
    const anomalies = [];
    
    // Check if Permissions API exists
    if (!navigator.permissions) {
      // Not an anomaly, just not supported
      return this.createResult(false, { supported: false }, 0);
    }

    try {
      // Check notification permission consistency
      const notificationStatus = await navigator.permissions.query({ name: 'notifications' });
      
      if (typeof Notification !== 'undefined') {
        const directPermission = Notification.permission;
        
        // Check for mismatch
        if ((directPermission === 'granted' && notificationStatus.state !== 'granted') ||
            (directPermission === 'denied' && notificationStatus.state !== 'denied') ||
            (directPermission === 'default' && notificationStatus.state !== 'prompt')) {
          anomalies.push('notification-permission-mismatch');
        }
      }

      // Check geolocation permission if available
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' });
        // In automation, geolocation is often pre-denied without user action
        if (geoStatus.state === 'denied' && window.outerWidth === 0) {
          anomalies.push('geo-denied-headless');
        }
      } catch (e) {
        // Geolocation permission query may not be supported
      }

      // Check if permission.query throws on valid permission
      try {
        await navigator.permissions.query({ name: 'camera' });
      } catch (e) {
        // Some headless browsers don't support camera permission
        if (e.name === 'TypeError') {
          anomalies.push('camera-permission-error');
        }
      }

    } catch (e) {
      // If permissions query throws unexpectedly, that's suspicious
      if (e.name !== 'TypeError') {
        anomalies.push('permissions-query-error');
      }
    }

    const triggered = anomalies.length > 0;
    const confidence = Math.min(1, anomalies.length * 0.4);

    return this.createResult(triggered, { anomalies }, confidence);
  }
}

export { PermissionsSignal };
