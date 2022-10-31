export { createStore } from './store';
export type { AppDispatch, RootState } from './store';

export {
  selectIsUserLoggedIn,
  selectRootSpanId,
  selectRootTraceId,
  selectSession,
  selectUserData,
  setSession,
  setUser,
} from './slices';
export type { FaroState, UserState } from './slices';
