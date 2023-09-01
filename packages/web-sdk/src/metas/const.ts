import { isObject } from '@grafana/faro-core';
import type { MetaItem } from '@grafana/faro-core';

import { browserMeta } from './browser';
import { k6Meta } from './k6';
import { pageMeta } from './page';

const isK6BrowserSession = isObject((window as any).k6);
const mandatoryDefaultMetas = [browserMeta, pageMeta];
export const defaultMetas: MetaItem[] = isK6BrowserSession ? mandatoryDefaultMetas : [...mandatoryDefaultMetas, k6Meta];
