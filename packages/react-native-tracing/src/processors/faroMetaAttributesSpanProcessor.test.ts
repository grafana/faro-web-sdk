import { ROOT_CONTEXT } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';

import type { Metas } from '@grafana/faro-core';

import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';

describe('FaroMetaAttributesSpanProcessor', () => {
  let provider: BasicTracerProvider;
  let mockProcessor: any;
  let mockMetas: Metas;

  beforeEach(() => {
    provider = new BasicTracerProvider();
    mockProcessor = {
      forceFlush: jest.fn().mockResolvedValue(undefined),
      onStart: jest.fn(),
      onEnd: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };

    mockMetas = {
      value: {
        session: {
          id: 'test-session-id',
        },
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          fullName: 'Test User',
          roles: 'admin, user',
          hash: 'test-hash',
        },
      },
      add: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  it('should add session ID to span attributes', () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);

    processor.onStart(span as any, ROOT_CONTEXT);

    expect((span as any).attributes['session.id']).toBe('test-session-id');
  });

  it('should add user attributes to span', () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);

    processor.onStart(span as any, ROOT_CONTEXT);

    expect((span as any).attributes['user.id']).toBe('test-user-id');
    expect((span as any).attributes['user.email']).toBe('test@example.com');
    expect((span as any).attributes['user.name']).toBe('testuser');
    expect((span as any).attributes['user.full_name']).toBe('Test User');
    expect((span as any).attributes['user.hash']).toBe('test-hash');
  });

  it('should parse and add user roles as array', () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);

    processor.onStart(span as any, ROOT_CONTEXT);

    expect((span as any).attributes['user.roles']).toEqual(['admin', 'user']);
  });

  it('should handle missing session gracefully', () => {
    mockMetas.value = { user: mockMetas.value.user };
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);

    processor.onStart(span as any, ROOT_CONTEXT);

    expect((span as any).attributes['session.id']).toBeUndefined();
    expect((span as any).attributes['user.id']).toBe('test-user-id');
  });

  it('should handle missing user gracefully', () => {
    mockMetas.value = { session: mockMetas.value.session };
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);

    processor.onStart(span as any, ROOT_CONTEXT);

    expect((span as any).attributes['session.id']).toBe('test-session-id');
    expect((span as any).attributes['user.id']).toBeUndefined();
  });

  it('should delegate onEnd to wrapped processor', () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span', {}, ROOT_CONTEXT);
    span.end();

    processor.onEnd(span as any);

    expect(mockProcessor.onEnd).toHaveBeenCalledWith(span);
  });

  it('should delegate forceFlush to wrapped processor', async () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);

    await processor.forceFlush();

    expect(mockProcessor.forceFlush).toHaveBeenCalled();
  });

  it('should delegate shutdown to wrapped processor', async () => {
    const processor = new FaroMetaAttributesSpanProcessor(mockProcessor, mockMetas);

    await processor.shutdown();

    expect(mockProcessor.shutdown).toHaveBeenCalled();
  });
});
