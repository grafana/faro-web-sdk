import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';

describe('faroMetaAttributesSpanProcessor', () => {
  const processor = new FaroMetaAttributesSpanProcessor(
    {
      onStart: jest.fn(),
      onEnd: jest.fn(),
      shutdown: jest.fn(),
      forceFlush: jest.fn(),
    },
    {
      value: {
        session: {
          id: 'session-id',
        },
        user: {
          email: 'email',
          id: 'id',
          username: 'user-short-name',
          fullName: 'user-full-name',
          roles: 'admin, editor,viewer',
          hash: 'hash',
        },
      },
      add: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }
  );

  it('adds attributes to span', () => {
    const span = {
      attributes: {},
    };

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toStrictEqual({
      'session.id': 'session-id',
      'user.email': 'email',
      'user.id': 'id',
      'user.full_name': 'user-full-name',
      'user.name': 'user-short-name',
      'user.roles': ['admin', 'editor', 'viewer'],
      'user.hash': 'hash',
    });
  });

  it('support multiple instances having their own metas', () => {
    const processor1 = new FaroMetaAttributesSpanProcessor(
      {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        shutdown: jest.fn(),
        forceFlush: jest.fn(),
      },
      {
        value: {
          session: {
            id: 'session-1',
          },
        },
        add: jest.fn(),
        remove: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }
    );

    const processor2 = new FaroMetaAttributesSpanProcessor(
      {
        onStart: jest.fn(),
        onEnd: jest.fn(),
        shutdown: jest.fn(),
        forceFlush: jest.fn(),
      },
      {
        value: {
          session: {
            id: 'session-2',
          },
        },
        add: jest.fn(),
        remove: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }
    );

    const span1 = {
      attributes: {},
    };

    const span2 = {
      attributes: {},
    };

    processor1.onStart(span1 as any, {} as any);
    processor2.onStart(span2 as any, {} as any);

    expect(span1.attributes).toMatchObject({
      'session.id': 'session-1',
    });

    expect(span2.attributes).toMatchObject({
      'session.id': 'session-2',
    });
  });
});
