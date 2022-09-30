import type {
  Request as ExpressRequest,
  RequestHandler as ExpressRequestHandler,
  Response as ExpressResponse,
} from 'express';
import type { ParsedQs } from 'qs';

import type { UserPublicModel } from '../../common';

export type MiddlewareLocals = {
  token: string | undefined;
  requestSpanId: string | null;
  requestTraceId: string | null;
  user: UserPublicModel;
};

export type Request<
  RouteParams extends Record<string, string> = any,
  ResBody extends Record<string, any> = any,
  ReqBody extends Record<string, any> = any,
  ReqQuery = ParsedQs
> = ExpressRequest<RouteParams, ResBody, ReqBody, ReqQuery, MiddlewareLocals>;

export type RequestHandler<
  RouteParams extends Record<string, string> = any,
  ResBody extends Record<string, any> = any,
  ReqBody extends Record<string, any> = any,
  ReqQuery extends ParsedQs = any
> = ExpressRequestHandler<RouteParams, ResBody, ReqBody, ReqQuery, MiddlewareLocals>;

export type Response<ResBody extends Record<string, any> = any> = ExpressResponse<ResBody, MiddlewareLocals>;
