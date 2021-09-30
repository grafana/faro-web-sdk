export interface Plugin {
  name: string;
  initialize: () => void;
}

export interface Config {
  plugins: Plugin[];
  preventWindowExposure: boolean;
  receiverUrl: string;
  windowObjectKey: string;
}

export interface Logger {
  sendEvent: (...args: unknown[]) => void;
}

export interface WindowObject {
  config: Config;
  logger: Logger;
}

export type UserConfig = Partial<Config> & {
  plugins: Config['plugins'];
  receiverUrl: Config['receiverUrl'];
};
