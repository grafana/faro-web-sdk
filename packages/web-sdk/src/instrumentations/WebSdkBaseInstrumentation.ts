import { BaseInstrumentation } from '@grafana/faro-core';

import { WebSdkConfig } from '../config/types';

export abstract class WebSdkBaseInstrumentation extends BaseInstrumentation<WebSdkConfig> {}
