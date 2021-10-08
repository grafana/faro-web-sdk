export enum PluginTypes {
  INSTRUMENTATION = 'instrumentation',
  META = 'meta',
}

export interface Plugin {
  name: string;
  type: PluginTypes;
  initialize: () => void;
}

export interface Config {
  plugins: Plugin[];
  preventWindowExposure: boolean;
  receiverUrl: string;
  windowObjectKey: string;
}

export enum LoggerLogLevels {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

export type BaseObjectKey = string | number;

export type BaseObjectValue = string | number | boolean | null | undefined | BaseObject | BaseObjectValue[];

export interface BaseObject {
  [key: BaseObjectKey]: BaseObjectValue;
}

export type LoggerContext = BaseObject;

export interface Logger {
  log: (args: unknown[], level?: LoggerLogLevels, context?: LoggerContext) => void;
  exception: (error: Error, context?: LoggerContext) => void;
}

export type MetaGetter = () => BaseObject;

export type MetaMap = Map<string | number, MetaGetter>;

export interface WindowObject {
  config: Config;
  logger: Logger;
  meta: MetaMap;
}

export type UserConfig = Partial<Config> & Pick<Config, 'plugins' | 'receiverUrl'>;

export type ApiPayload = BaseObject;

export interface StackFrame extends BaseObject {
  colno: number;
  filename: string;
  function: string;
  in_app: boolean;
  lineno: number;
}
