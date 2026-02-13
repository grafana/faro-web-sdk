import { type ReplayInstrumentationOptions } from './types';

export const defaultReplayInstrumentationOptions: ReplayInstrumentationOptions = {
  maskAllInputs: false,
  maskInputOptions: {
    password: true,
  },
  maskInputFn: undefined,
  maskTextSelector: undefined,
  blockSelector: undefined,
  ignoreSelector: undefined,
  collectFonts: false,
  inlineImages: false,
  inlineStylesheet: false,
  recordCanvas: false,
  recordCrossOriginIframes: false,
  beforeSend: undefined,
  recordAfter: 'load',
};
