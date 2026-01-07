import {
  BaseInstrumentation,
  type Subscription,
  type UserActionInterface,
  type UserActionInternalInterface,
  userActionsMessageBus,
  VERSION,
} from '@grafana/faro-core';

import { UserActionController } from './userActionController';

/**
 * User Actions instrumentation for React Native
 *
 * Tracks user interactions when components use the withFaroUserAction HOC
 * or call the trackUserAction helper directly.
 *
 * Features:
 * - Intelligent duration tracking based on activity
 * - HTTP request correlation
 * - Automatic lifecycle management
 * - Halt state for pending async operations
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
    this.logInfo('User action instrumentation initialized with enhanced tracking');

    // Subscribe to user action events from the message bus
    this._userActionSub = userActionsMessageBus.subscribe(({ type, userAction }) => {
      if (type === 'user_action_start') {
        this.logDebug(`User action started: ${userAction.name}`);
        this.processUserActionStarted(userAction);
      }
    });
  }

  /**
   * Process a started user action by attaching a controller
   * The controller handles intelligent duration tracking and HTTP correlation
   */
  private processUserActionStarted(userAction: UserActionInterface): void {
    try {
      const internalUserAction = userAction as unknown as UserActionInternalInterface;
      const controller = new UserActionController(internalUserAction);
      controller.attach();
    } catch (error) {
      this.logError('Error attaching user action controller:', error);
    }
  }

  unpatch(): void {
    this._userActionSub?.unsubscribe();
    this._userActionSub = undefined;
  }
}
