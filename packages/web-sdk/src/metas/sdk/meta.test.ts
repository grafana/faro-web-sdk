import { sdkMeta } from './meta';

// Mock the faro object
jest.mock('@grafana/faro-core', () => ({
  ...jest.requireActual('@grafana/faro-core'),
  faro: {
    config: {
      validateSdkMeta: false,
      instrumentations: [],
    },
    internalLogger: {
      warn: jest.fn(),
    },
  },
}));

describe('sdkMeta', () => {
  let mockFaro: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { faro } = require('@grafana/faro-core');
    mockFaro = faro;
    mockLogger = faro.internalLogger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when validateSdkMeta is disabled', () => {
    beforeEach(() => {
      mockFaro.config.validateSdkMeta = false;
    });

    it('should not validate version when validation is disabled', () => {
      const testVersion = 'invalid-version';
      const result = (sdkMeta as any)(testVersion);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(result.sdk.version).toBe(testVersion);
    });

    it('should return correct sdk meta structure', () => {
      const testVersion = '1.0.0';
      const result = (sdkMeta as any)(testVersion);

      expect(result).toEqual({
        sdk: {
          name: '@grafana/faro-core',
          version: testVersion,
          integrations: [],
        },
      });
    });
  });

  describe('when validateSdkMeta is enabled', () => {
    beforeEach(() => {
      mockFaro.config.validateSdkMeta = true;
    });

    it('should not log warning for valid semver versions', () => {
      const validVersions = [
        '1.0.0',
        '1.2.3',
        '10.20.30',
        '1.1.2-prerelease+meta',
        '1.1.2+meta',
        '1.1.2+meta-valid',
        '1.0.0-alpha',
        '1.0.0-beta',
        '1.0.0-alpha.beta',
        '1.0.0-alpha.1',
        '1.0.0-alpha0.valid',
        '1.0.0-alpha.0valid',
        '1.0.0-rc.1+metadata',
      ];

      validVersions.forEach((version) => {
        mockLogger.warn.mockClear();
        const result = (sdkMeta as any)(version);

        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(result.sdk.version).toBe(version);
      });
    });

    it('should log warning for invalid semver versions', () => {
      const invalidVersions = [
        'invalid-version',
        '1',
        '1.2',
        '1.2.3-',
        '1.2.3-+',
        '1.2.3-+123',
        '+invalid',
        '-invalid',
      ];

      invalidVersions.forEach((version) => {
        mockLogger.warn.mockClear();
        const result = (sdkMeta as any)(version);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `Invalid SDK version "${version}". Expected a valid semver (e.g., "1.2.3", "1.2.3-beta.1").`
        );
        expect(result.sdk.version).toBe(version);
      });
    });

    it('should include instrumentations in the meta', () => {
      mockFaro.config.instrumentations = [
        { name: 'foo', version: '1.0.0' },
        { name: 'bar', version: '2.0.0' },
      ];
      const testVersion = '1.0.0';
      const result = (sdkMeta as any)(testVersion);

      expect(result.sdk.integrations).toEqual([
        { name: 'foo', version: '1.0.0' },
        { name: 'bar', version: '2.0.0' },
      ]);
    });
  });
});