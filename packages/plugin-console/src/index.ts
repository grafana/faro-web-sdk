import { allLogLevels, getMessage, getTransportBody, LogLevel } from '@grafana/javascript-agent-core';
import type { Agent, Plugin } from '@grafana/javascript-agent-core';

const patchConsoleMethod = (agent: Agent, level: LogLevel) => {
  /* eslint-disable-next-line no-console */
  console[level] = (...args) => {
    try {
      agent.api.pushLog([], level);
    } catch (err) {
    } finally {
      agent.api.callOriginalConsoleMethod(level, ...args);
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
      allLogLevels
        .filter((level) => !(disabledInstrumentationLevels ?? defaultDisabledLevels).includes(level))
        .forEach((level) => patchConsoleMethod(agent, level));
    };
  }

  if (enableTransport) {
    const message = getMessage('New event');

    plugin.transports = (agent) => [
      (item) => {
        agent.api.callOriginalConsoleMethod(transportLevel ?? LogLevel.DEBUG, message, getTransportBody(item));
      },
    ];
  }

  return plugin;
}
