import { type SessionRecordingInstrumentationOptions } from './types';

export const defaultSessionRecordingInstrumentationOptions: SessionRecordingInstrumentationOptions = {
  maskAllInputs: false,
  maskInputOptions: {
    password: true,
  },
  maskSelector: undefined,
  blockSelector: undefined,
  ignoreSelector: undefined,
  collectFonts: false,
  inlineImages: false,
  inlineStylesheet: false,
  recordCanvas: false,
  recordCrossOriginIframes: false,
  beforeSend: undefined,
};
