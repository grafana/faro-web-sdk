import { articlesAPI } from './articles';
import { authAPI } from './auth';
import { seedAPI } from './seed';

export const apiMiddleware = [authAPI.middleware, articlesAPI.middleware, seedAPI.middleware];
