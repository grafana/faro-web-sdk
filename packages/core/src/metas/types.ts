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
  release?: string;
  version?: string;
  environment?: string;
}

export interface MetaUser {
  email?: string;
  id?: string;
  username?: string;
  attributes?: MetaAttributes;
}

export interface MetaSession {
  id?: string;
  attributes?: MetaAttributes;
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
}

export interface MetaView {
  name: string;
}

export interface MetaK6 {
  isK6Browser?: boolean;
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
