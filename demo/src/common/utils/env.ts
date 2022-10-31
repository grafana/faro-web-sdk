export function getEnvConfig(vars: Record<string, string | undefined>, nodeEnv?: string | undefined) {
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
    faro: {
      apiKey: vars['AGENT_KEY_APP_RECEIVER']!,
      host: vars['DEMO_SERVER_AGENT_HOST']! || vars['AGENT_HOST']!,
      portAppReceiver: vars['AGENT_PORT_APP_RECEIVER']!,
      portTraces: vars['TEMPO_PORT_OTLP_RECEIVER']!,
    },
    client: {
      packageName: vars['DEMO_CLIENT_PACKAGE_NAME']!,
    },
    database: {
      host: vars['DEMO_SERVER_DATABASE_HOST']! || vars['DATABASE_HOST']!,
      name: vars['DATABASE_NAME']!,
      password: vars['DATABASE_PASSWORD']!,
      port: vars['DATABASE_PORT']!,
      user: vars['DATABASE_USER']!,
    },
    grafana: {
      port: vars['GRAFANA_PORT']!,
    },
    package: {
      version: vars['DEMO_PACKAGE_VERSION']!,
    },
    server: {
      logsPath: vars['DEMO_SERVER_LOGS_PATH']!,
      logsName: vars['DEMO_SERVER_LOGS_NAME']!,
      packageName: vars['DEMO_SERVER_PACKAGE_NAME']!,
      port: vars['DEMO_PORT']!,
    },
    mode,
  };
}

export function getPublicEnvConfig({ database: _database, ...env } = getEnvConfig(process.env)) {
  return env;
}

export type Env = ReturnType<typeof getEnvConfig>;

export type PublicEnv = ReturnType<typeof getPublicEnvConfig>;
