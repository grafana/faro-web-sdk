# @grafana/javascript-agent-core

Core package of Grafana JavaScript Agent.

The entire architecture of the library is contained within this package. Out of the box, it doesn't collect any metrics,
logs etc. but it offers an API to capture them.

---

## Agent

The agent is an object which can be accessed by either importing it from the package or by referencing it from the
global object (`window` in browsers and `global` in Node.js).
