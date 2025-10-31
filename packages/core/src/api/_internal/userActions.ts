import { type UserActionInterface, type UserActionInternals } from '../userActions';

const _userActionInternals = new WeakMap<UserActionInterface, UserActionInternals>();

export function getUserActionInternalView(userAction: UserActionInterface): UserActionInternals | undefined {
  return _userActionInternals.get(userAction);
}

export function setUserActionInternalView(userAction: UserActionInterface, internals: UserActionInternals): void {
  _userActionInternals.set(userAction, internals);
}

export function removeUserActionInternalView(userAction: UserActionInterface): void {
  _userActionInternals.delete(userAction);
}
