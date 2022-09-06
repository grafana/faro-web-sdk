import type {
  Request as ExpressRequest,
  RequestHandler as ExpressRequestHandler,
  Response as ExpressResponse,
} from 'express';
import type { ParsedQs } from 'qs';

import type { UserPublic } from '../../models';

export type Request<
  RouteParams extends Record<string, string>,
  ResBody extends Record<string, any>,
  ReqBody extends Record<string, any>,
  ReqQuery = ParsedQs
> = ExpressRequest<RouteParams, ResBody, ReqBody, ReqQuery, { token: string | undefined; user: UserPublic }>;

export type RequestHandler<
  RouteParams extends Record<string, string> = any,
  ResBody extends Record<string, any> = any,
  ReqBody extends Record<string, any> = any,
  ReqQuery extends ParsedQs = any
> = ExpressRequestHandler<RouteParams, ResBody, ReqBody, ReqQuery, { token: string | undefined; user: UserPublic }>;

export type Response<ResBody = any> = ExpressResponse<ResBody, { token: string | undefined; user: UserPublic }>;
