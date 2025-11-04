export const userActionStartByApiCallEventName = 'faroApiCall';

export const userActionStart = 'user_action_start';

export const UserActionImportance = {
  Normal: 'normal',
  Critical: 'critical',
} as const;

export type UserActionImportanceType = (typeof UserActionImportance)[keyof typeof UserActionImportance];
