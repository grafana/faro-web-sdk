export interface Plugin {
  name: string;
  initialize: (config: Config) => void;
}

export interface Config {
  plugins: Plugin[];
  preventWindowExposure: boolean;
  windowObject: string;
}

export type UserConfig = Partial<Config>;

export function getConfigFromUserConfig(userConfig: UserConfig): Config {
  return {
    plugins: [],
    preventWindowExposure: false,
    windowObject: 'grafanaFEAgent',
    ...userConfig,
  };
}
