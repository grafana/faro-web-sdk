import type { StackframeParserOptions } from '../../utils/stackFrames/types';

export interface ExtendedPromiseRejectionEvent extends PromiseRejectionEvent {
  detail?: {
    reason: PromiseRejectionEvent['reason'];
  };
}

export type ErrorEvent = (Error | Event) & {
  error?: Error;
};

export type ErrorInstrumentationOptions = {
  stackframeParserOptions?: StackframeParserOptions;
};
