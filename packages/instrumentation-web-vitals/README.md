# @grafana/javascript-agent-instrumentation-web-vitals

Grafana JavaScript Agent browser package which collects [web vitals](https://web.dev/vitals/) metrics from the app.

Under the hood it leverages [web-vitals](https://github.com/GoogleChrome/web-vitals) to obtain the data.

Collected data and browser compatibility:

| Indicator                                        | Acronym | Chromium-based browsers | Safari | Firefox | Internet Explorer |
| ------------------------------------------------ | ------- | ----------------------- | ------ | ------- | ----------------- |
| [Cumulative Layout Shift](https://web.dev/cls/)  | CLS     | Yes                     | No     | No      | No                |
| [First Contentful Paint](https://web.dev/fcp/)   | FCP     | Yes                     | Yes    | Yes     | No                |
| [First Input Delay](https://web.dev/fid/)        | FID     | Yes                     | Yes    | Yes     | No                |
| [Largest Contentful Paint](https://web.dev/lcp/) | LCP     | Yes                     | No     | No      | No                |
| [Time to First Byte](https://web.dev/ttfb/)      | TTFB    | Yes                     | Yes    | Yes     | Yes               |

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import webVitalsInstrumentation from '@grafana/javascript-agent-instrumentation-web-vitals';

const agent = initializeAgent({
  instrumentations: [
    // Add the package to the instrumentations list when initializing the agent
    webVitalsInstrumentation,
  ],
});
```
