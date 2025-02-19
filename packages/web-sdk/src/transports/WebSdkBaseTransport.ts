import { BaseTransport } from '@grafana/faro-core';

import { WebSdkConfig } from '../config/types';

export abstract class WebSdkBaseTransport extends BaseTransport<WebSdkConfig> {}
