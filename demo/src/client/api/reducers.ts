import { articlesAPI } from './articles';
import { authAPI } from './auth';
import { seedAPI } from './seed';

export const apiReducers = {
  [authAPI.reducerPath]: authAPI.reducer,
  [articlesAPI.reducerPath]: articlesAPI.reducer,
  [seedAPI.reducerPath]: seedAPI.reducer,
};
