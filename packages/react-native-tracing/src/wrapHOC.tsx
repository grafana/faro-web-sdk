import React, { useEffect } from 'react';
// @ts-ignore
// eslint-disable-next-line import/namespace
import { Alert, NativeModules } from 'react-native';

import { api } from './dependencies';

interface StartupMetrics {
  startupTime: number;
}

const measureStartupTime = async (): Promise<void> => {
  try {
    const hasAppRestarted = await NativeModules['NativeInstrumentation'].getHasAppRestarted();

    if (hasAppRestarted) {
      return;
    }

    const metrics: StartupMetrics = await NativeModules['NativeInstrumentation'].getStartupTime();

    const currentTime = Date.now();
    const startupDuration = currentTime - metrics.startupTime;

    api.pushMeasurement({
      type: 'app_startup_time',
      values: {
        startup_duration: startupDuration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.warn('[NativeInstrumentation] Failed to measure startup time:', error);
  }
};

export function wrap<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithStartupTracking(props: P) {
    useEffect(() => {
      measureStartupTime();
    }, []);

    // @ts-ignore
    return <WrappedComponent {...props} />;
  };
}
