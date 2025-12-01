import { BaseInstrumentation, VERSION, userActionsMessageBus, type Subscription } from '@grafana/faro-core';

/**
 * User Actions instrumentation for React Native
 *
 * Tracks user interactions when components use the withFaroUserAction HOC
 * or call the trackUserAction helper directly.
 *
 * @example
 * ```tsx
 * import { withFaroUserAction } from '@grafana/faro-react-native';
 *
 * const TrackedButton = withFaroUserAction(TouchableOpacity, 'button_pressed');
 *
 * <TrackedButton onPress={handlePress}>
 *   <Text>Click me</Text>
 * </TrackedButton>
 * ```
 */
export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-user-action';
  readonly version = VERSION;

  private _userActionSub?: Subscription;

  initialize(): void {
    this.logInfo('User action instrumentation initialized');

    // Subscribe to user action events from the message bus
    this._userActionSub = userActionsMessageBus.subscribe(({ type, userAction }) => {
      if (type === 'user_action_start') {
        // User action started, could add additional processing here
        this.logDebug(`User action started: ${userAction.name}`);
      }
    });
  }

  unpatch(): void {
    this._userActionSub?.unsubscribe();
    this._userActionSub = undefined;
  }
}
