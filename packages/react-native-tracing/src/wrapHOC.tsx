import React, { useEffect } from 'react';

import { api } from './dependencies';

interface StartupMetrics {
  startStartupTime: number;
  endStartupTime: number;
  startupDuration: number;
}

// TODO(@lucasbento): figure out where to best place this function
const measureStartupTime = async (): Promise<void> => {
  try {
    const metrics: StartupMetrics =
      await require('react-native')['NativeModules']['NativeInstrumentation'].getStartupTime();

    api.pushMeasurement({
      type: 'app_startup_time',
      values: {
        startup_duration: metrics.startupDuration,
      },
    });
  } catch (error) {
    console.warn('[NativeInstrumentation] Failed to measure startup time:', error);
  }
};

export function wrap<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithStartupTracking(props: P) {
    useEffect(() => {
      measureStartupTime();
    }, []);

    return <WrappedComponent {...props} />;
  };
}
