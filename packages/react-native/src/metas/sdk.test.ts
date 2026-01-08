import { initializeFaro, VERSION } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getSdkMeta } from './sdk';

describe('SDK meta', () => {
  describe('getSdkMeta', () => {
    it('returns SDK name and version', () => {
      const config = mockConfig({});
      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.name).toBe('@grafana/faro-react-native');
      expect(meta.sdk.version).toBe(VERSION);
    });

    it('includes integrations from instrumentations', () => {
      const mockInstrumentation1 = {
        name: 'test-instrumentation-1',
        version: '1.0.0',
        initialize: jest.fn(),
      };

      const mockInstrumentation2 = {
        name: 'test-instrumentation-2',
        version: '2.0.0',
        initialize: jest.fn(),
      };

      const config = mockConfig({
        instrumentations: [mockInstrumentation1, mockInstrumentation2] as any,
      });

      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.integrations).toHaveLength(2);
      expect(meta.sdk.integrations).toEqual([
        { name: 'test-instrumentation-1', version: '1.0.0' },
        { name: 'test-instrumentation-2', version: '2.0.0' },
      ]);
    });

    it('returns empty integrations array when no instrumentations', () => {
      const config = mockConfig({
        instrumentations: [],
      });

      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.integrations).toEqual([]);
    });

    it('extracts only name and version from instrumentations', () => {
      const mockInstrumentation = {
        name: 'test-instrumentation',
        version: '1.0.0',
        initialize: jest.fn(),
        otherProperty: 'should-not-appear',
        anotherProperty: 123,
      };

      const config = mockConfig({
        instrumentations: [mockInstrumentation] as any,
      });

      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.integrations).toEqual([
        { name: 'test-instrumentation', version: '1.0.0' },
      ]);
      expect(meta.sdk.integrations[0]).not.toHaveProperty('initialize');
      expect(meta.sdk.integrations[0]).not.toHaveProperty('otherProperty');
      expect(meta.sdk.integrations[0]).not.toHaveProperty('anotherProperty');
    });

    it('returns a function that can be called multiple times', () => {
      const config = mockConfig({});
      initializeFaro(config);

      const sdkMeta = getSdkMeta();

      const meta1 = sdkMeta();
      const meta2 = sdkMeta();

      expect(meta1).toEqual(meta2);
      expect(meta1.sdk.name).toBe('@grafana/faro-react-native');
      expect(meta2.sdk.name).toBe('@grafana/faro-react-native');
    });

    it('returns consistent structure', () => {
      const config = mockConfig({});
      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta).toHaveProperty('sdk');
      expect(meta.sdk).toHaveProperty('name');
      expect(meta.sdk).toHaveProperty('version');
      expect(meta.sdk).toHaveProperty('integrations');
      expect(Array.isArray(meta.sdk.integrations)).toBe(true);
    });

    it('handles instrumentations with only required properties', () => {
      const mockInstrumentation = {
        name: 'minimal-instrumentation',
        version: '1.0.0',
        initialize: jest.fn(),
      };

      const config = mockConfig({
        instrumentations: [mockInstrumentation] as any,
      });

      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.integrations).toEqual([
        { name: 'minimal-instrumentation', version: '1.0.0' },
      ]);
    });

    it('maps multiple instrumentations preserving order', () => {
      const instrumentations = [
        { name: 'first', version: '1.0.0', initialize: jest.fn() },
        { name: 'second', version: '2.0.0', initialize: jest.fn() },
        { name: 'third', version: '3.0.0', initialize: jest.fn() },
      ];

      const config = mockConfig({
        instrumentations: instrumentations as any,
      });

      initializeFaro(config);

      const sdkMeta = getSdkMeta();
      const meta = sdkMeta();

      expect(meta.sdk.integrations).toEqual([
        { name: 'first', version: '1.0.0' },
        { name: 'second', version: '2.0.0' },
        { name: 'third', version: '3.0.0' },
      ]);
    });
  });
});
