import type { ErrorResponse, SuccessResponse } from './generic';

export type SeedGetPayload = {};

export type SeedGetSuccessPayload = SuccessResponse & {
  spanId: string;
  traceId: string;
};

export type SeedGetErrorPayload = ErrorResponse & {
  spanId: string;
  traceId: string;
};
