import type { ApiHandlerPayload } from './api';
import { config } from './config';

export interface Plugin {
  name: string;

  apiHandler?: (payload: ApiHandlerPayload) => void;
  registerInstrumentation?: () => void;
  registerMeta?: () => void;
}

export function initializePlugins(): void {
  config.plugins.forEach((plugin) => {
    if (plugin.apiHandler) {
      config.apiHandlers.push(plugin.apiHandler);
    }
  });

  config.plugins.forEach((plugin) => {
    plugin.registerMeta?.();
  });

  config.plugins.forEach((plugin) => {
    plugin.registerInstrumentation?.();
  });
}
