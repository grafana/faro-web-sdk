import { LogLevels } from '@grafana/frontend-agent-core';
import type { Agent, Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const patchConsole = (agent: Agent, level: LogLevels) => {
  const original = console[level];

  console[level] = (...args) => {
    try {
      agent.logger.pushLog([], level);
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
    instrumentations: (agent) => {
      allLevels.filter((level) => !disabledLevels.includes(level)).forEach((level) => patchConsole(agent, level));
    },
  };
}
