import { getMessage, getTransportBody, LogLevel } from '@grafana/javascript-agent-core';
import type { Agent, Plugin } from '@grafana/javascript-agent-core';

/* eslint-disable no-console */

const allLevels: LogLevel[] = [
  LogLevel.TRACE,
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.LOG,
  LogLevel.WARN,
  LogLevel.ERROR,
];

const unpatchedConsoleMethods = allLevels.reduce((acc, level) => {
  acc[level] = console[level];

  return acc;
}, {} as { [level in LogLevel]: typeof console[level] });

const callUnpatchedConsoleMethod = (level: LogLevel, ...args: unknown[]) => {
  unpatchedConsoleMethods[level].apply(console, args);
};

const patchConsoleMethod = (agent: Agent, level: LogLevel) => {
  console[level] = (...args) => {
    try {
      agent.api.pushLog([], level);
    } catch (err) {
    } finally {
      callUnpatchedConsoleMethod(level, ...args);
    }
  };
};

const defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.LOG];

export interface ConsolePluginOptions {
  disabledInstrumentationLevels?: LogLevel[];
  enableInstrumentation?: boolean;
  enableTransport?: boolean;
  transportLevel?: LogLevel;
}

export default function getPlugin({
  disabledInstrumentationLevels,
  enableInstrumentation,
  enableTransport,
  transportLevel,
}: ConsolePluginOptions): Plugin {
  const plugin: Plugin = {
    name: '@grafana/javascript-agent-plugin-console',
  };

  if (enableInstrumentation ?? true) {
    plugin.instrumentations = (agent) => {
      allLevels
        .filter((level) => !(disabledInstrumentationLevels ?? defaultDisabledLevels).includes(level))
        .forEach((level) => patchConsoleMethod(agent, level));
    };
  }

  if (enableTransport) {
    const message = getMessage('New event');

    plugin.transports = () => [
      (item) => {
        callUnpatchedConsoleMethod(transportLevel ?? LogLevel.DEBUG, message, getTransportBody(item));
      },
    ];
  }

  return plugin;
}
