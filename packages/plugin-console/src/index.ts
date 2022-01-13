import { LogLevel } from '@grafana/frontend-agent-core';
import type { Agent, Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const patchConsole = (agent: Agent, level: LogLevel) => {
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

const allLevels: LogLevel[] = [
  LogLevel.TRACE,
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.LOG,
  LogLevel.WARN,
  LogLevel.ERROR,
];

export default function getPlugin(disabledLevels: LogLevel[] = []): Plugin {
  return {
    name: '@grafana/frontend-agent-plugin-console',
    instrumentations: (agent) => {
      allLevels.filter((level) => !disabledLevels.includes(level)).forEach((level) => patchConsole(agent, level));
    },
  };
}
