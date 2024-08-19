# Use with Angular application

Create file `faro-initializer.ts` and add your SDK configuration:

```typescript
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';

export function faroInitializer(): Function {
  return async () => {
    initializeFaro({
      url: 'https://collector-host:12345/collect',
      apiKey: 'secret',
      app: {
        name: 'frontend',
        version: '1.0.0',
      },
      instrumentations: [...getWebInstrumentations({ captureConsole: true, captureConsoleDisabledLevels: [] })],
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

At this stage all your logs will be auto-captured and sent to Grafana Faro!

However, you will not see any errors in the Error Awareness page.
By default Angular errors are printed to the console and
cannot be automatically captured as a Faro error log.

The solution involves implementing and customizing Angular's
default ErrorHandler class and manually capturing exceptions
at a global level by using the Faro API to capture errors.

Create a file `global-error-handler.ts` and add the following code:

```typescript
import { ErrorHandler, Injectable } from '@angular/core';
import { faro } from '@grafana/faro-web-sdk';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any) {
    if (error instanceof Error) {
      faro.api.pushError(error);
    }
    console.error(error);
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
