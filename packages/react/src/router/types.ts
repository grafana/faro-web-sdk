export interface ReactRouterLocation<S extends any = unknown> {
  hash: string;
  key: string;
  pathname: string;
  search: string;
  state: S;
}

export interface ReactRouterHistory extends Record<string, any> {
  listen?: (cb: (location: ReactRouterLocation, action: NavigationType) => void) => void;
  location?: ReactRouterLocation;
}

export enum ReactRouterVersion {
  V4 = 'v4',
  V5 = 'v5',
  V6 = 'v6',
  V6_data_api = 'v6_data_api',
}

export enum NavigationType {
  Pop = 'POP',
  Push = 'PUSH',
  Replace = 'REPLACE',
}
