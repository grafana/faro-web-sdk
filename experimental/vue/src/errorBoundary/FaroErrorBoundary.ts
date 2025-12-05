import { defineComponent } from 'vue';
import type { PropType } from 'vue';

import type { PushErrorOptions } from '@grafana/faro-web-sdk';

import { internalLogger } from '../dependencies';

import type { FaroErrorBoundaryProps } from './types';
import { useFaroErrorBoundary } from './useFaroErrorBoundary';

export const FaroErrorBoundary = defineComponent({
  name: 'FaroErrorBoundary',
  props: {
    beforeCapture: {
      type: Function as PropType<FaroErrorBoundaryProps['beforeCapture']>,
      required: false,
    },
    fallback: {
      type: [Object, Function] as PropType<FaroErrorBoundaryProps['fallback']>,
      required: false,
    },
    onError: {
      type: Function as PropType<FaroErrorBoundaryProps['onError']>,
      required: false,
    },
    onReset: {
      type: Function as PropType<FaroErrorBoundaryProps['onReset']>,
      required: false,
    },
    pushErrorOptions: {
      type: Object as PropType<PushErrorOptions>,
      required: false,
    },
  },
  setup(props, { slots }) {
    const { state, resetErrorBoundary } = useFaroErrorBoundary({
      beforeCapture: props.beforeCapture,
      onError: props.onError,
      onReset: props.onReset,
      pushErrorOptions: props.pushErrorOptions,
    });

    return () => {
      // If no error, render children
      if (!state.value.hasError) {
        return slots['default']?.();
      }

      // If there's an error, render fallback
      const { fallback } = props;

      if (!fallback) {
        return null;
      }

      // If fallback is a function, call it with error and reset function
      if (typeof fallback === 'function') {
        try {
          return fallback(state.value.error!, resetErrorBoundary);
        } catch (err) {
          internalLogger?.warn('FaroErrorBoundary\n', 'Error in fallback render function:', err);
          return null;
        }
      }

      // If fallback is a VNode, render it
      return fallback;
    };
  },
});
