import type {
  MESSAGE_TYPE_DOM_MUTATION,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from './const';

export type DomMutationMessage = {
  type: typeof MESSAGE_TYPE_DOM_MUTATION;
};

type RequestApiType = 'xhr' | 'fetch';

export type HttpRequestMessagePayload = {
  requestId: string;
  url: string;
  method: string;
  apiType: RequestApiType;
};

export type HttpRequestStartMessage = {
  type: typeof MESSAGE_TYPE_HTTP_REQUEST_START;
  request: HttpRequestMessagePayload;
};

export type HttpRequestEndMessage = {
  type: typeof MESSAGE_TYPE_HTTP_REQUEST_END;
  request: HttpRequestMessagePayload;
};
