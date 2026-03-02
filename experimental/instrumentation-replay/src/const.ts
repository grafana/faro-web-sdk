import { type ReplayInstrumentationOptions } from './types';

export const defaultReplayInstrumentationOptions: ReplayInstrumentationOptions = {
  maskAllInputs: true,
  maskInputOptions: {
    password: true,
  },
  maskInputFn: undefined,
  maskTextSelector: '*',
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
