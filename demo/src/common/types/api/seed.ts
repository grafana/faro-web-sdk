import type { ErrorResponse, SuccessResponse } from './generic';

export type SeedGetPayload = {};

export type SeedGetSuccessPayload = SuccessResponse<boolean>;

export type SeedGetErrorPayload = ErrorResponse;
