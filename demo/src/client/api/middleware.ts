import { articlesAPI } from './articles';
import { authAPI } from './auth';

export const apiMiddleware = [authAPI.middleware, articlesAPI.middleware];
