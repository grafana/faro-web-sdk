import { ReactRouterVersion } from '../types';

import { createReactRouterV7DataOptions, createReactRouterV7Options } from './initialize';
import { ReactRouterV6DataRouterDependencies, ReactRouterV6Dependencies } from './types';

const mockV6Dependencies: ReactRouterV6Dependencies = {
  Routes: jest.fn() as any,
  useLocation: jest.fn(),
  useNavigationType: jest.fn(),
  createRoutesFromChildren: jest.fn(),
  matchRoutes: jest.fn(),
};

const mockV6DataRouterDependencies: ReactRouterV6DataRouterDependencies = {
  matchRoutes: jest.fn(),
};

describe('createReactRouterV7Options', () => {
  it('returns V7 config with dependencies', () => {
    expect(createReactRouterV7Options(mockV6Dependencies)).toEqual({
      version: ReactRouterVersion.V7,
      dependencies: mockV6Dependencies,
    });
  });
});

describe('createReactRouterV7DataOptions', () => {
  it('returns V7 data router config with dependencies', () => {
    expect(createReactRouterV7DataOptions(mockV6DataRouterDependencies)).toEqual({
      version: ReactRouterVersion.V7_data_router,
      dependencies: mockV6DataRouterDependencies,
    });
  });
});
