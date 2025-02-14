import { fetch, Request, Response } from '@remix-run/web-fetch';
import { TextDecoder, TextEncoder } from 'node:util';

if (!globalThis.fetch) {
  // @ts-expect-error
  globalThis.fetch = fetch;

  // @ts-expect-error
  globalThis.Request = Request;

  // @ts-expect-error
  globalThis.Response = Response;
}

Object.assign(global, { TextEncoder, TextDecoder });
