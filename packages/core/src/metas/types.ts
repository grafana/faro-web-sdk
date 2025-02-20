export type MetaGetter<P = Partial<Meta>> = () => P;

export type MetaItem<P = Partial<Meta>> = P | MetaGetter<P>;

export type MetasListener = (value: Meta) => void;

export interface Metas {
  add: (...getters: MetaItem[]) => void;
  remove: (...getters: MetaItem[]) => void;
  addListener: (listener: MetasListener) => void;
  removeListener: (listener: MetasListener) => void;
  value: Meta;
}

export type MetaAttributes = Record<string, string>;

export interface MetaSDKIntegration {
  name?: string;
  version?: string;
}

export interface MetaSDK {
  name?: string;
  version?: string;
  integrations?: MetaSDKIntegration[];
}

export interface MetaApp {
  name?: string;
  namespace?: string;
  release?: string;
  version?: string;
  environment?: string;
  bundleId?: string;
}

export interface MetaUser {
  /**
   * User email address.
   */
  email?: string;
  /**
   * Unique identifier
   */
  id?: string;
  /**
   * Short name or login/username of the user.
   */
  username?: string;
  /**
   * User’s full name
   */
  fullName?: string;
  /**
   * comma separated list of user roles. "admin",editor" etc.
   */
  roles?: string;
  /**
   * Unique user hash to correlate information for a user in anonymized form.
   */
  hash?: string;
  /**
   * arbitrary user attributes, must be of type string.
   */
  attributes?: MetaAttributes;
}

export interface MetaSession {
  id?: string;
  attributes?: MetaAttributes;
  overrides?: MetaOverrides;
}

export interface MetaPage {
  id?: string;
  url?: string;
  attributes?: MetaAttributes;
}

interface NavigatorUABrandVersion {
  brand?: string;
  version?: string;
}

export interface MetaBrowser {
  name?: string;
  version?: string;
  os?: string;
  mobile?: boolean;
  userAgent?: string;
  language?: string;
  brands?: NavigatorUABrandVersion[] | string;
  viewportWidth?: string;
  viewportHeight?: string;
}

export interface MetaView {
  name: string;
}

export interface MetaK6 {
  isK6Browser?: boolean;
  testRunId?: string;
}

export interface Meta {
  sdk?: MetaSDK;
  app?: MetaApp;
  user?: MetaUser;
  session?: MetaSession;
  page?: MetaPage;
  browser?: MetaBrowser;
  view?: MetaView;
  k6?: MetaK6;
}

/**
 * MetaOverrides are instructions that allow the receiver to override certain properties (Grafana Cloud only).
 */
export type MetaOverrides = {
  /**
   * New service name (Grafana Cloud only)
   */
  serviceName?: string;

  /**
   * Enable or disable geolocation tracking (Grafana Cloud only).
   * Geolocation tracking must be enabled in the Grafana Cloud settings first.
   * It cannot be enabled solely on the client side.
   * This option allows control over tracking on the client side to comply with user
   * privacy requirements.
   */
  geoLocationTrackingEnabled?: boolean;
};
