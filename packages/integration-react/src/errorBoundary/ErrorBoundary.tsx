import { agent, isFunction } from '@grafana/agent-web';
import { Component, isValidElement } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { isReactVersionAtLeast17 } from '../utils';
import { errorBoundaryInitialState } from './const';
import type { ErrorBoundaryProps, ErrorBoundaryState } from './types';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = errorBoundaryInitialState;

  constructor(props: ErrorBoundaryProps) {
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

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorWithComponentStack = this.getErrorWithComponentStack(error, errorInfo);

    this.props.beforeCapture?.(errorWithComponentStack, errorInfo.componentStack);

    agent.api.pushError(errorWithComponentStack);

    this.props.onError?.(errorWithComponentStack, errorInfo.componentStack);

    this.setState({ error: errorWithComponentStack, componentStack: errorInfo.componentStack });
  }

  override componentDidMount(): void {
    this.props.onMount?.();
  }

  override componentWillUnmount(): void {
    this.props.onUnmount?.(this.state.error, this.state.componentStack);
  }

  resetErrorBoundary(): void {
    this.props.onReset?.(this.state.error, this.state.componentStack);

    this.setState(errorBoundaryInitialState);
  }

  override render(): ReactNode {
    if (!this.state.error) {
      return isFunction(this.props.children) ? this.props.children() : this.props.children;
    }

    const element = !isFunction(this.props.fallback)
      ? this.props.fallback
      : this.props.fallback(this.state.error, this.state.componentStack, this.resetErrorBoundary);

    if (isValidElement(element)) {
      return element;
    }

    if (this.props.fallback) {
      agent.internalLogger.warn('ErrorBoundary\n', 'Cannot get a valid ReactElement from "fallback"');
    }

    return null;
  }
}
