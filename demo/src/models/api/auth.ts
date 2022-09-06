import type { UserInput, UserPublic } from '../data';
import type { ErrorResponse, SuccessResponse } from './generic';

export type AuthRegisterPayload = UserInput;

export type AuthRegisterSuccessPayload = UserPublic;

export type AuthRegisterErrorPayload = ErrorResponse;

export type AuthLoginPayload = {
  email: string;
  password: string;
};

export type AuthLoginSuccessPayload = UserPublic;

export type AuthLoginErrorPayload = ErrorResponse;

export type AuthLogoutPayload = {};

export type AuthLogoutSuccessPayload = SuccessResponse;

export type AuthLogoutErrorPayload = ErrorResponse;

export type AuthGetAuthStatePayload = {};

export type AuthGetAuthStateSuccessPayload = UserPublic;

export type AuthGetAuthStateErrorPayload = ErrorResponse;
