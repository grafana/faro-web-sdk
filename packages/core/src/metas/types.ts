export type MetaGetter = () => Partial<Meta>;
export type MetaItem = Partial<Meta> | MetaGetter;
export interface Metas {
  add: (getter: MetaItem) => void;
  remove: (getter: MetaItem) => void;
  value: Meta;
}

type Attributes = Record<string, string>;

interface SDKIntegration {
  name?: string;
  version?: string;
}

export interface SDK {
  name?: string;
  version?: string;
  integrations?: SDKIntegration[];
}

export interface App {
  name?: string;
  release?: string;
  version?: string;
  environment?: string;
}

export interface User {
  email?: string;
  id?: string;
  username?: string;
  attributes?: Attributes;
}

export interface Session {
  id?: string;
  attributes?: Attributes;
}

export interface Page {
  id?: string;
  url?: string;
  attributes?: Attributes;
}

export interface Browser {
  name?: string;
  version?: string;
  os?: string;
  mobile?: boolean;
}

export interface Meta {
  sdk?: SDK;
  app?: App;
  user?: User;
  session?: Session;
  page?: Page;
  browser?: Browser;
}
