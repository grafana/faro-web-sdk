# @grafana/javascript-agent-plugin-browser-meta

Grafana JavaScript Agent plugin for collecting details about the browser, operating system and device type.

Under the hood it leverages [ua-parser-js](https://github.com/faisalman/ua-parser-js) to parse the user agent string.

The collected information are:

- `name` - browser name
- `version` - browser version
- `os` - operating system name and version
- `mobile` - device type (desktop or mobile)

This should be used in combination with other plugins to provide data about the environment where an error occurred or
a console event happened.

---

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import browserMetaPlugin from '@grafana/javascript-agent-plugin-browser-meta';

const agent = initializeAgent({
  plugins: [
    // Add the plugin to the plugins list while initializing the agent
    browserMetaPlugin,
  ],
});
```
