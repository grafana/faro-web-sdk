import { type MaskInputFn, type ReplayInstrumentationOptions } from './types';

const FIXED_LENGTH_MASK = '******';

export const defaultMaskInputFn: MaskInputFn = () => FIXED_LENGTH_MASK;

export const defaultReplayInstrumentationOptions: ReplayInstrumentationOptions = {
  maskAllInputs: true,
  maskInputOptions: {
    password: true,
  },
  maskInputFn: defaultMaskInputFn,
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
  samplingRate: 1,
  inactivityThresholdMs: 60_000,
};
