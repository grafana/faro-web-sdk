import { articlesAPI } from './articles';
import { authAPI } from './auth';

export const apiReducers = {
  [authAPI.reducerPath]: authAPI.reducer,
  [articlesAPI.reducerPath]: articlesAPI.reducer,
};
