import { Component, type ErrorInfo, type ReactNode } from 'react';

import { defaultUnpatchedConsole, faro } from '@grafana/faro-core';

import { faroErrorBoundaryInitialState } from './const';
import type { FaroErrorBoundaryProps, FaroErrorBoundaryState } from './types';

/**
 * React Error Boundary with Faro integration
 *
 * Catches React component errors and sends them to Faro for monitoring.
 * Provides lifecycle hooks and custom fallback UI support.
 *
 * @example
 * ```tsx
 * import { FaroErrorBoundary } from '@grafana/faro-react-native';
 *
 * function App() {
 *   return (
 *     <FaroErrorBoundary
 *       fallback={<Text>Something went wrong</Text>}
 *     >
 *       <YourApp />
 *     </FaroErrorBoundary>
 *   );
 * }
 * ```
 */
export class FaroErrorBoundary extends Component<FaroErrorBoundaryProps, FaroErrorBoundaryState> {
  override state: FaroErrorBoundaryState = faroErrorBoundaryInitialState;

  constructor(props: FaroErrorBoundaryProps) {
    super(props);
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  /**
   * Creates an error with React component stack included
   */
  getErrorWithComponentStack(error: Error, errorInfo: ErrorInfo): Error {
    if (!errorInfo.componentStack) {
      return error;
    }

    const newError = new Error(error.message);
    newError.name = `React ErrorBoundary ${error.name}`;
    newError.stack = errorInfo.componentStack;

    return newError;
  }

  static getDerivedStateFromError(error: Error): FaroErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorWithComponentStack = this.getErrorWithComponentStack(error, errorInfo);

    // Call beforeCapture hook
    this.props.beforeCapture?.(errorWithComponentStack);

    // Send error to Faro
    faro.api.pushError(errorWithComponentStack, this.props.pushErrorOptions);

    // Call onError hook
    this.props.onError?.(errorWithComponentStack);

    // Note: Don't call setState here - getDerivedStateFromError already set the state
  }

  override componentDidMount(): void {
    this.props.onMount?.();
  }

  override componentWillUnmount(): void {
    this.props.onUnmount?.(this.state.error);
  }

  resetErrorBoundary(): void {
    this.props.onReset?.(this.state.error);
    this.setState(faroErrorBoundaryInitialState);
  }

  override render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return typeof this.props.children === 'function'
        ? (this.props.children as () => ReactNode)()
        : this.props.children;
    }

    const element =
      typeof this.props.fallback !== 'function'
        ? this.props.fallback
        : this.props.fallback(this.state.error, this.resetErrorBoundary);

    // Check if element exists - isValidElement may fail in monorepos with multiple React instances
    if (element != null) {
      return element;
    }

    if (this.props.fallback) {
      defaultUnpatchedConsole.warn('[Faro ErrorBoundary] Cannot get a valid ReactElement from "fallback"');
    }

    return null;
  }
}
