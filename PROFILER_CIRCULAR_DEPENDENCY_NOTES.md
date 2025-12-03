# FaroProfiler Circular Dependency Investigation

## Date
2025-12-03

## Issue Summary
Attempted to implement `FaroProfiler` component for React Native to achieve feature parity with the web SDK. However, encountered a persistent circular dependency issue that prevents the app from loading.

## Error
```
[runtime not ready]: TypeError: 0, _$_REQUIRE(_dependencyMap[3](...)-react-native").markBundleLoaded is not a function (it is undefined)
```

The functions `markAppStart`, `markBundleLoaded`, and `trackScreenPerformance` are being imported as `undefined` despite being properly exported.

## Root Cause

The circular dependency occurs during module initialization in Metro bundler due to the following chain:

1. **Demo app** (`demo-react-native/index.js`) imports `markAppStart` from `@grafana/faro-react-native`
2. **Main package** (`packages/react-native/src/index.ts`) exports these functions from `./instrumentations/performance/helpers`
3. **helpers.ts** (or the original `performance/index.ts`) imports from `performanceUtils` to access the performance store
4. **performanceUtils.ts** imports `Platform` from `react-native` at the top of the file
5. When `react-native` module loads, it tries to evaluate the entire dependency tree, but `markAppStart` hasn't been fully defined yet
6. Result: The functions become `undefined` during module initialization

### Key Discovery
The issue is NOT a simple import cycle, but rather a **module initialization order problem**. When Metro bundles the code:
- Files that import from `react-native` are evaluated during the `react-native` module initialization
- Any functions exported from those files (or files that import from them) are not yet fully defined
- The functions exist in the module namespace but are `undefined` during initialization

## Attempted Solutions

### Attempt 1: Remove hoist-non-react-statics
- **Action**: Removed `hoist-non-react-statics` package from `withFaroProfiler` HOC
- **Result**: Error persisted
- **Reason**: The issue was not with this dependency

### Attempt 2: Separate Entry Point
- **Action**: Created `src/profiler.ts` as a separate entry point for profiler components
- **Result**: Profiler loading issues resolved, but helper functions still undefined
- **Reason**: Didn't address the root cause of the circular dependency

### Attempt 3: Metro Bundler Configuration
- **Action**: Modified `metro.config.js` with `blockList` to exclude certain React imports
- **Result**: Failed - caused SHA-1 errors and blocked legitimate files
- **Reason**: Too aggressive and not the right approach

### Attempt 4: Separate performanceStore.ts File
- **Action**: Created `performanceStore.ts` without react-native imports, separate from `performanceUtils.ts`
- **Files**:
  - `performanceStore.ts` - Store classes (NO react-native imports)
  - `performanceUtils.ts` - Utility functions WITH react-native imports
  - `helpers.ts` - Helper functions importing from `performanceStore.ts`
- **Result**: Error persisted
- **Reason**: The import chain still existed: helpers → performanceStore → (shared with performanceUtils) → react-native

### Attempt 5: Completely Standalone helpers.ts
- **Action**: Made `helpers.ts` with ZERO imports - completely standalone with inline Map storage
- **Result**: Metro bundled successfully but error persisted
- **Reason**: Either Metro was still caching old evaluations, or the monorepo source file resolution was using a different code path

## Files Involved

### Created (then reverted):
1. `/packages/react-native/src/profiler.ts` - Separate profiler entry point
2. `/packages/react-native/src/profiler/FaroProfiler.tsx` - Main profiler component
3. `/packages/react-native/src/profiler/withFaroProfiler.tsx` - HOC wrapper
4. `/packages/react-native/src/instrumentations/performance/helpers.ts` - Standalone helper functions
5. `/packages/react-native/src/instrumentations/performance/performanceStore.ts` - Store without react-native imports

### Modified (then reverted by linter):
1. `/packages/react-native/src/index.ts` - Updated exports
2. `/packages/react-native/src/instrumentations/performance/index.ts` - Removed duplicate function definitions
3. `/packages/react-native/src/instrumentations/performance/performanceUtils.ts` - Attempted to separate concerns
4. `/packages/react-native/package.json` - Added exports configuration for profiler entry point

## Environment Details

- **React Native Version**: 0.82
- **Metro Version**: 0.83.3
- **Build Tool**: Yarn workspaces with Lerna monorepo
- **Platform**: iOS Simulator (iPhone 17 Pro)
- **Node Version**: 22.21.1

## Potential Solutions for Future Attempts

### Option 1: Build the Package First
Instead of using source files directly via Metro's monorepo resolution, build the package and have the demo app use the built artifacts. This would:
- Ensure proper module boundaries
- Eliminate source-level circular dependencies
- Match production usage more closely

**Implementation**:
```bash
cd packages/react-native
yarn build
# Demo app would then use the built dist/ files
```

### Option 2: Inline All Helper Code
Create a completely standalone file with all helper functionality inlined, no imports whatsoever. Not even from the same package.

**Implementation**:
```typescript
// packages/react-native/src/standalone-helpers.ts
const globalTimings = new Map<string, number>();

export function markAppStart(): void {
  globalTimings.set('app_start', Date.now());
}

export function markBundleLoaded(): void {
  globalTimings.set('bundle_loaded', Date.now());
}

// ... etc, with no imports at all
```

### Option 3: Lazy Initialization
Delay the import of performance utilities until first use, rather than at module load time.

**Implementation**:
```typescript
export function markAppStart(): void {
  const { performanceStore } = require('./performanceUtils');
  performanceStore.set('app_start', Date.now());
}
```

### Option 4: Use a Different Package for Helpers
Create a completely separate npm package (e.g., `@grafana/faro-react-native-helpers`) with zero dependencies that only contains these helper functions. This would:
- Guarantee no circular dependencies
- Provide a clean separation
- Allow the demo app to import directly without going through the main package

### Option 5: Global Object Storage
Use React Native's global object to store timing values, completely bypassing the module system:

**Implementation**:
```typescript
const getGlobalStore = () => {
  if (!global.__FARO_PERFORMANCE_STORE__) {
    global.__FARO_PERFORMANCE_STORE__ = new Map();
  }
  return global.__FARO_PERFORMANCE_STORE__;
};

export function markAppStart(): void {
  getGlobalStore().set('app_start', Date.now());
}
```

## Recommendations

1. **Preferred Solution**: Option 1 (Build the package first) - Most production-like and respects module boundaries
2. **Alternative**: Option 5 (Global object) - Simplest to implement and guarantees no circular dependencies
3. **If monorepo source resolution is required**: Option 2 (Inline all code) with extensive testing

## Notes

- The `--reset-cache` flag for Metro was used throughout testing but didn't resolve the issue
- Multiple Watchman cache clears were performed
- The error suggests Metro might cache module evaluation results beyond what `--reset-cache` clears
- The monorepo setup with source file resolution (via `react-native` field in package.json) may be causing Metro to handle modules differently than in a standard app

## Status

**REVERTED** - All changes have been rolled back. The `feat/react-native-support` branch is back to a clean state without the FaroProfiler implementation.

## Next Steps

When attempting this again:
1. Choose one of the potential solutions above
2. Test in a separate branch to avoid polluting the main feature branch
3. Consider creating a minimal reproduction case outside the monorepo to verify the solution works
4. Document any Metro bundler quirks discovered during testing
