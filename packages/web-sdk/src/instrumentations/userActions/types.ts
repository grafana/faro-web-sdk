import type {
  MESSAGE_TYPE_DOM_MUTATION,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from './const';

export type DomMutationMessage = {
  type: typeof MESSAGE_TYPE_DOM_MUTATION;
};

export type HttpRequestStartMessage = {
  type: typeof MESSAGE_TYPE_HTTP_REQUEST_START;
  pending: number;
};

export type HttpRequestEndMessage = {
  type: typeof MESSAGE_TYPE_HTTP_REQUEST_END;
  pending: number;
};
