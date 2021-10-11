import { logger, LoggerLogLevels, Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const patchConsole = (level: LoggerLogLevels) => {
  const original = console[level];

  console[level] = (...args) => {
    try {
      logger.log(args, level);
    } catch (err) {
    } finally {
      original(...args);
    }
  };
};

const allLevels: LoggerLogLevels[] = [
  LoggerLogLevels.TRACE,
  LoggerLogLevels.DEBUG,
  LoggerLogLevels.INFO,
  LoggerLogLevels.LOG,
  LoggerLogLevels.WARN,
  LoggerLogLevels.ERROR,
];

export default function getPlugin(disabledLevels: LoggerLogLevels[] = []): Plugin {
  return {
    name: '@grafana/frontend-agent-plugin-console',
    registerInstrumentation: () => {
      allLevels.filter((level) => !disabledLevels.includes(level)).forEach((level) => patchConsole(level));
    },
  };
}
