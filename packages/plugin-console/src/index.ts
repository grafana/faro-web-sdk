import { LoggingLevels } from '@grafana/frontend-agent-core';
import type { Agent, Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const patchConsole = (agent: Agent, level: LoggingLevels) => {
  const original = console[level];

  console[level] = (...args) => {
    try {
      agent.commander.pushLog([], level);
    } catch (err) {
    } finally {
      original.call(console, args);
    }
  };
};

const allLevels: LoggingLevels[] = [
  LoggingLevels.TRACE,
  LoggingLevels.DEBUG,
  LoggingLevels.INFO,
  LoggingLevels.LOG,
  LoggingLevels.WARN,
  LoggingLevels.ERROR,
];

export default function getPlugin(disabledLevels: LoggingLevels[] = []): Plugin {
  return {
    name: '@grafana/frontend-agent-plugin-console',
    instrumentations: (agent) => {
      allLevels.filter((level) => !disabledLevels.includes(level)).forEach((level) => patchConsole(agent, level));
    },
  };
}
