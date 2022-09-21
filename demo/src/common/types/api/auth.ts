import type { UserInputModel, UserPublicModel } from '../models';
import type { ErrorResponse, SuccessResponse } from './generic';

export type AuthRegisterPayload = UserInputModel;

export type AuthRegisterSuccessPayload = UserPublicModel;

export type AuthRegisterErrorPayload = ErrorResponse;

export type AuthLoginPayload = {
  email: string;
  password: string;
};

export type AuthLoginSuccessPayload = UserPublicModel;

export type AuthLoginErrorPayload = ErrorResponse;

export type AuthLogoutPayload = {};

export type AuthLogoutSuccessPayload = SuccessResponse;

export type AuthLogoutErrorPayload = ErrorResponse;

export type AuthGetAuthStatePayload = {};

export type AuthGetAuthStateSuccessPayload = UserPublicModel;

export type AuthGetAuthStateErrorPayload = ErrorResponse;
