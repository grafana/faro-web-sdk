import { defineComponent } from 'vue';

import { useFaroProfiler } from './useFaroProfiler';

export const FaroProfiler = defineComponent({
  name: 'FaroProfiler',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props, { slots }) {
    useFaroProfiler(props.name);

    return () => slots['default']?.();
  },
});
