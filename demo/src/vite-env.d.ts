/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEMO_HOST: string;
  readonly DEMO_PORT: string;
  readonly DEMO_PACKAGE_NAME: string;
  readonly DEMO_PACKAGE_VERSION: string;
  readonly DEMO_CLIENT_PACKAGE_NAME: string;
  readonly DEMO_SERVER_PACKAGE_NAME: string;
  readonly DEMO_SERVER_LOGS_NAME: string;
  readonly DEMO_SERVER_LOGS_PATH: string;
  readonly AGENT_PORT_APP_RECEIVER: string;
  readonly AGENT_PORT_TRACES_RECEIVER: string;
  readonly AGENT_KEY_APP_RECEIVER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
