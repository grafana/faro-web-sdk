export interface Config {
  preventWindowExposure: boolean;
  windowObject: string;
}

export type UserConfig = Partial<Config>;

export function getConfigFromUserConfig(userConfig: UserConfig): Config {
  return {
    preventWindowExposure: false,
    windowObject: 'grafanaFrontendAgent',
    ...userConfig,
  };
}
