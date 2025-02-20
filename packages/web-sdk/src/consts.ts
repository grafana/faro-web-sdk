import { faro as faroCore } from '@grafana/faro-core';

import { Faro } from './initialize';

export const defaultEventDomain = 'browser';

export const faro: Faro = faroCore;
