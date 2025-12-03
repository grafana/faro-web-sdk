import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for OTEL
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock Request and Response for fetch instrumentation tests
class MockRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

class MockResponse {
  ok: boolean = true;
  status: number = 200;
  statusText: string = 'OK';
}

(global as any).Request = MockRequest;
(global as any).Response = MockResponse;
