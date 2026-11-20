import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(global, { TextEncoder, TextDecoder });
