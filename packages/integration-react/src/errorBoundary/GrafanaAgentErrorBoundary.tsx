import { Component, isValidElement } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { agent, isFunction } from '@grafana/agent-web';

import { isReactVersionAtLeast17 } from '../utils';
import { grafanaAgentErrorBoundaryInitialState } from './const';
import type { GrafanaAgentErrorBoundaryProps, GrafanaAgentErrorBoundaryState } from './types';

export class GrafanaAgentErrorBoundary extends Component<
  GrafanaAgentErrorBoundaryProps,
  GrafanaAgentErrorBoundaryState
> {
  override state: GrafanaAgentErrorBoundaryState = grafanaAgentErrorBoundaryInitialState;

  constructor(props: GrafanaAgentErrorBoundaryProps) {
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

  static getDerivedStateFromError(error: Error): GrafanaAgentErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorWithComponentStack = this.getErrorWithComponentStack(error, errorInfo);

    this.props.beforeCapture?.(errorWithComponentStack);

    agent.api.pushError(errorWithComponentStack);

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

    this.setState(grafanaAgentErrorBoundaryInitialState);
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
      agent.internalLogger.warn('ErrorBoundary\n', 'Cannot get a valid ReactElement from "fallback"');
    }

    return null;
  }
}
