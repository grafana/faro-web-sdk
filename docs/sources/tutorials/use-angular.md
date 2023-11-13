## Use with Angular application


Create file `faro-initializer.ts` and add your SDK configuration :

```typescript
import { initializeFaro } from '@grafana/faro-web-sdk';

export function faroInitializer(): Function {
  return async () => {
      initializeFaro({
          url: 'https://collector-host:12345/collect',
          apiKey: 'secret',
          app: {
              name: 'frontend',
              version: '1.0.0',
          },
          instrumentations: [...getWebInstrumentations({ captureConsole: true, captureConsoleDisabledLevels: [] })]
      });
  };
}
```

In the `app.module.ts` init faroInitializer function :

```typescript
import { APP_INITIALIZER, NgModule } from '@angular/core';

@NgModule({
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: faroInitializer,
            deps: [], // <-- Add your dependencies here 
            multi: true,
        }
    ],
})
export class AppModule {}
```

Well done this stage all your logs will be captured and sent to Grafana Faro !

However, you will not see any errors in the Error Awareness page.
By default Angular errors are printed in the console and cannot be captured with the `kind=exception` flag of the Grafana Faro SDK.

The solution involves implementing and customizing Angular's default ErrorHandler class and using the Faro API to capture errors.

Create a file `global-error-handler.ts` and add the following code :

```typescript
import { ErrorHandler, Injectable } from '@angular/core';
import { faro } from '@grafana/faro-web-sdk';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  handleError(error: any) {
    if (error instanceof Error) {
      faro.api.pushError(error);
      return;
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
