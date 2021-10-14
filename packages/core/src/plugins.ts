export interface Plugin {
  name: string;

  registerInstrumentation?: () => void;
  registerMeta?: () => void;
}

export function initializePlugins(plugins: Plugin[]): void {
  plugins.forEach((plugin) => {
    plugin.registerMeta?.();
  });

  plugins.forEach((plugin) => {
    plugin.registerInstrumentation?.();
  });
}
