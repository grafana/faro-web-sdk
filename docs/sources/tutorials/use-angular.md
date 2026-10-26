# Use with Angular application

Create file `faro-initializer.ts` and add your SDK configuration:

```typescript
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';

export function faroInitializer(): () => void {
  return () => {
    initializeFaro({
      url: 'https://collector-host:12345/collect',
      apiKey: 'secret',
      app: {
        name: 'frontend',
        version: '1.0.0',
      },
      instrumentations: [...getWebInstrumentations({ captureConsole: true })],
      consoleInstrumentation: {
        disabledLevels: [],
      },
    });
  };
}
```

In the `app.module.ts` initialize the `faroInitializer` function:

```typescript
import { APP_INITIALIZER, NgModule } from '@angular/core';

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: faroInitializer,
      deps: [], // <-- Add your dependencies here
      multi: true,
    },
  ],
})
export class AppModule {}
```

At this stage all your console messages will be auto-captured and sent to Grafana Faro.

Angular errors are normally handled by Angular's `ErrorHandler` and printed to the console.
To capture them explicitly as Faro errors in the Frontend Observability Errors page,
customize Angular's global error handler.

Create a file `global-error-handler.ts` and add the following code:

```typescript
import { ErrorHandler, Injectable } from '@angular/core';
import { faro } from '@grafana/faro-web-sdk';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    faro.api.pushError(normalizedError);
    // Preserve console output without creating a second Faro error.
    (faro.unpatchedConsole ?? console).error(error);
  }
}
```

Then your `app.module.ts` should look like this

```typescript
import { APP_INITIALIZER, NgModule, ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from './global-error-handler';

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: faroInitializer,
      deps: [],
      multi: true,
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
  ],
})
export class AppModule {}
```
