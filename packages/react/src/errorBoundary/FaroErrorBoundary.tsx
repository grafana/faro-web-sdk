import { Component, isValidElement } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { isFunction } from '@grafana/faro-web-sdk';

import { api, internalLogger } from '../dependencies';
import { isReactVersionAtLeast17 } from '../utils';

import { faroErrorBoundaryInitialState } from './const';
import type { FaroErrorBoundaryProps, FaroErrorBoundaryState } from './types';

export class FaroErrorBoundary extends Component<FaroErrorBoundaryProps, FaroErrorBoundaryState> {
  override state: FaroErrorBoundaryState = faroErrorBoundaryInitialState;

  constructor(props: FaroErrorBoundaryProps) {
    super(props);

    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  getErrorWithComponentStack(error: Error, errorInfo: ErrorInfo): Error {
    if (!isReactVersionAtLeast17 || !errorInfo.componentStack) {
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

    this.props.beforeCapture?.(errorWithComponentStack);

    api.pushError(errorWithComponentStack);

    this.props.onError?.(errorWithComponentStack);

    this.setState({ hasError: true, error });
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
    if (!this.state.hasError) {
      return isFunction(this.props.children) ? this.props.children() : this.props.children;
    }

    const element = !isFunction(this.props.fallback)
      ? this.props.fallback
      : this.props.fallback(this.state.error!, this.resetErrorBoundary);

    if (isValidElement(element)) {
      return element;
    }

    if (this.props.fallback) {
      internalLogger?.warn('ErrorBoundary\n', 'Cannot get a valid ReactElement from "fallback"');
    }

    return null;
  }
}
