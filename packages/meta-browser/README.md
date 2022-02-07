# @grafana/javascript-agent-meta-browser

Grafana JavaScript Agent browser package for collecting details about the browser, operating system and device type.

Under the hood it leverages [ua-parser-js](https://github.com/faisalman/ua-parser-js) to parse the user agent string.

The collected information are:

- `name` - browser name
- `version` - browser version
- `os` - operating system name and version
- `mobile` - device type (desktop or mobile)

This should be used in combination with other packages to provide data about the environment where an error occurred or
a console event happened.

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import browserMeta from '@grafana/javascript-agent-meta-browser';

const agent = initializeAgent({
  metas: [
    // Add the package to the metas list when initializing the agent
    browserMeta,
  ],
});
```
