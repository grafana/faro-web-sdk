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
});
