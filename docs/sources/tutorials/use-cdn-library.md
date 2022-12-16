# Use CDN to install Grafana Web SDK

Grafana Web SDK is also available as an IIFE bundle that can be loaded from a CDN like [unpkg][unpkg] to
directly serve the desired version of the library.

Example usage:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>My App</title>

    <script>
      // Initialize Faro when the main bundle loads
      window.init = () => {
        window.GrafanaFaroWebSdk.initializeFaro({
          app: {
            name: 'test',
          },
          transports: [new window.GrafanaFaroWebSdk.ConsoleTransport()],
        });
      };

      // Dynamically add the tracing instrumentation when the tracing bundle loads
      window.addTracing = () => {
        window.GrafanaFaroWebSdk.faro.instrumentations.add(new window.GrafanaFaroWebTracing.TracingInstrumentation());
      };
    </script>
  </head>
  <body>
    <!-- Load the bundles from unpkg -->
    <!-- Be sure to use the appropiate version instead of the one below -->
    <script
      src="https://unpkg.com/@grafana/faro-web-sdk@1.0.0-beta4/dist/bundle/faro-web-sdk.iife.js"
      onload="window.init()"
    ></script>
    <script
      src="https://unpkg.com/@grafana/faro-web-tracing@1.0.0-beta4/dist/bundle/faro-web-tracing.iife.js"
      onload="window.addTracing()"
    ></script>
  </body>
</html>
```

[unpkg]: https://unpkg.com/
