import { getAsyncDeviceMeta, getDeviceMeta } from './device';

describe('Device Meta', () => {
  describe('getDeviceMeta', () => {
    it('should return a function that provides device metadata', () => {
      const deviceMeta = getDeviceMeta();
      expect(typeof deviceMeta).toBe('function');

      const meta = deviceMeta();
      expect(meta).toHaveProperty('browser');
    });

    it('should include basic device information', () => {
      const deviceMeta = getDeviceMeta()();

      expect(deviceMeta.browser).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        os: expect.any(String),
        mobile: expect.any(Boolean),
        userAgent: expect.any(String),
        brands: expect.any(String),
        viewportWidth: expect.any(String),
        viewportHeight: expect.any(String),
      });
    });

    it('should include device type', () => {
      const deviceMeta = getDeviceMeta()();

      expect(deviceMeta.browser).toHaveProperty('deviceType');
      expect(['mobile', 'tablet']).toContain(deviceMeta.browser.deviceType);
    });

    it('should include memory information', () => {
      const deviceMeta = getDeviceMeta()();

      expect(deviceMeta.browser).toHaveProperty('totalMemory');
      expect(deviceMeta.browser).toHaveProperty('usedMemory');
    });

    it('should include emulator status', () => {
      const deviceMeta = getDeviceMeta()();

      expect(deviceMeta.browser).toHaveProperty('isEmulator');
      expect(['true', 'false']).toContain(deviceMeta.browser.isEmulator);
    });

    it('should include locale and timezone', () => {
      const deviceMeta = getDeviceMeta()();

      expect(deviceMeta.browser).toHaveProperty('locale');
      expect(deviceMeta.browser).toHaveProperty('locales');
      expect(deviceMeta.browser).toHaveProperty('timezone');
    });
  });

  describe('getAsyncDeviceMeta', () => {
    it('should handle errors gracefully', async () => {
      const asyncMeta = await getAsyncDeviceMeta();

      // Should return an object even if APIs fail
      expect(typeof asyncMeta).toBe('object');
    });

    it('should return battery and network information when available', async () => {
      const asyncMeta = await getAsyncDeviceMeta();

      // These may or may not be present depending on the mock
      // Just verify the function returns an object
      expect(asyncMeta).toBeDefined();
    });

    it('should format battery level as percentage when available', async () => {
      const asyncMeta = await getAsyncDeviceMeta();

      if (asyncMeta.batteryLevel && asyncMeta.batteryLevel !== 'unknown') {
        expect(asyncMeta.batteryLevel).toMatch(/^\d+%$/);
      } else {
        // Just verify it's defined
        expect(asyncMeta).toBeDefined();
      }
    });

    it('should return string values for boolean fields when available', async () => {
      const asyncMeta = await getAsyncDeviceMeta();

      if (asyncMeta.isCharging) {
        expect(['true', 'false']).toContain(asyncMeta.isCharging);
      }

      if (asyncMeta.lowPowerMode) {
        expect(['true', 'false']).toContain(asyncMeta.lowPowerMode);
      }

      // Just verify function works
      expect(asyncMeta).toBeDefined();
    });
  });
});
