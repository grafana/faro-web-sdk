import type { MetaItem } from '@grafana/faro-core';

import { browserMeta } from './browser';
import { pageMeta } from './page';

export const defaultMetas: MetaItem[] = [browserMeta, pageMeta];
