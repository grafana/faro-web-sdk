export function getEnvConfig(vars: Record<string, string>, nodeEnv?: string | undefined) {
  nodeEnv = nodeEnv ?? 'development';

  const prod = nodeEnv === 'production';
  const test = !prod && nodeEnv === 'test';
  const dev = !prod && !test;
  const mode = {
    prod,
    test,
    dev,
    name: prod ? 'production' : test ? 'test' : 'development',
  };

  return {
    clientPackageName: vars['DEMO_CLIENT_PACKAGE_NAME']!,
    serverPackageName: vars['DEMO_SERVER_PACKAGE_NAME']!,
    packageVersion: vars['DEMO_PACKAGE_VERSION']!,
    serverPort: vars['DEMO_PORT']!,
    serverLogsPath: vars['DEMO_SERVER_LOGS_PATH']!,
    serverLogsName: vars['DEMO_SERVER_LOGS_NAME']!,
    // Given the mixed usage between Docker Containers and Host, this is the best way to ensure the Agent is always reachable.
    agentHost: 'localhost',
    agentPortAppReceiver: vars['AGENT_PORT_APP_RECEIVER']!,
    agentPortTraces: vars['TEMPO_PORT_OTLP_RECEIVER']!,
    agentApiKey: vars['AGENT_KEY_APP_RECEIVER']!,
    mode,
  };
}

export type Env = ReturnType<typeof getEnvConfig>;
