import { AppState, type AppStateStatus } from 'react-native';

import { BaseInstrumentation, dateNow, EVENT_APP_STATE_CHANGED, VERSION } from '@grafana/faro-core';

/**
 * AppState instrumentation for React Native
 * Tracks app foreground/background/inactive state changes
 *
 * AppState values:
 * - 'active': App is running in the foreground
 * - 'background': App is running in the background (user has switched to another app or home screen)
 * - 'inactive': Transitional state (e.g., incoming call, opening control center on iOS)
 * - 'unknown': Initial state before first change (iOS only)
 * - 'extension': App extension is running (iOS only)
 */
export class AppStateInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-appstate';
  readonly version = VERSION;

  private currentState: AppStateStatus | undefined;
  private stateStartTime: number | undefined;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined;

  initialize(): void {
    // Get initial app state
    this.currentState = AppState.currentState;
    this.stateStartTime = dateNow();

    this.logInfo('AppState instrumentation initialized', {
      initialState: this.currentState,
    });

    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handles app state changes and emits app_state_changed events
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const previousState = this.currentState;
    const now = dateNow();
    const duration = this.stateStartTime ? now - this.stateStartTime : 0;

    // Update state tracking
    this.currentState = nextAppState;
    this.stateStartTime = now;

    // Log the state change
    this.logDebug('App state changed', {
      from: previousState,
      to: nextAppState,
      duration,
    });

    // Emit app state change event
    this.api.pushEvent(
      EVENT_APP_STATE_CHANGED,
      {
        fromState: previousState ?? 'unknown',
        toState: nextAppState,
        duration: duration.toString(),
        timestamp: now.toString(),
      },
      undefined,
      { skipDedupe: true }
    );

    // Additional logging for specific transitions
    if (nextAppState === 'background') {
      this.logInfo('App moved to background', { fromState: previousState, duration });
    } else if (nextAppState === 'active' && previousState === 'background') {
      this.logInfo('App returned to foreground', { duration });
    } else if (nextAppState === 'inactive') {
      this.logDebug('App became inactive', { fromState: previousState });
    }
  };

  /**
   * Get the current app state
   */
  getCurrentState(): AppStateStatus | undefined {
    return this.currentState;
  }

  /**
   * Get the duration the app has been in the current state (in milliseconds)
   */
  getCurrentStateDuration(): number {
    if (!this.stateStartTime) {
      return 0;
    }
    return dateNow() - this.stateStartTime;
  }

  /**
   * Check if app is currently in the foreground (active state)
   */
  isActive(): boolean {
    return this.currentState === 'active';
  }

  /**
   * Check if app is currently in the background
   */
  isBackground(): boolean {
    return this.currentState === 'background';
  }

  /**
   * Cleanup: Remove app state listener
   */
  unpatch(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = undefined;
      this.logInfo('AppState instrumentation unpatched');
    }
  }
}
