import { logger, LogLevels } from '@grafana/frontend-agent-core';
import type { Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const patchConsole = (level: LogLevels) => {
  const original = console[level];

  console[level] = (...args) => {
    try {
      logger.log(args, level);
    } catch (err) {
    } finally {
      original.call(console, args);
    }
  };
};

const allLevels: LogLevels[] = [
  LogLevels.TRACE,
  LogLevels.DEBUG,
  LogLevels.INFO,
  LogLevels.LOG,
  LogLevels.WARN,
  LogLevels.ERROR,
];

export default function getPlugin(disabledLevels: LogLevels[] = []): Plugin {
  return {
    name: '@grafana/frontend-agent-plugin-console',
    registerInstrumentation: () => {
      allLevels.filter((level) => !disabledLevels.includes(level)).forEach((level) => patchConsole(level));
    },
  };
}
