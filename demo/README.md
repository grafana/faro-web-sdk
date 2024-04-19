# Faro Demo

This small project demonstrates how to use the Faro and its packages.

The app is built using:

- Client
  - [React][react]
  - [React Router][react-router]
  - [Redux][redux]
  - [Redux Toolkit][redux-toolkit]
  - [Redux Toolkit Query][redux-toolkit-query]
  - [Faro][faro-web-sdk]
  - [Server-side rendering (SSR)][ssr]
  - [React Bootstrap][react-bootstrap]
  - [React Hook Form][react-hook-form]
- Server
  - [Express][express]
  - [PostgreSQL][postgresql]
  - [Sequelize][sequelize]
  - [OpenTelemetry][opentelemetry-js]
    - Instrumentations:
      - [Express][opentelemetry-js-express]
      - [HTTP][opentelemetry-js-http]
      - [PostgreSQL][opentelemetry-js-postgresql]
      - [Winston][opentelemetry-js-winston]
  - [Winston][winston]
  - [prom-client][prom-client]
- Misc
  - [dotenv][dotenv]
  - [Vite][vite]

Besides the app itself, the demo can also spawn the entire architecture for testing Faro:

- [Grafana][grafana]
- [Loki][loki]
- [Tempo][tempo]
- [Mimir][mimir]

## Installation

The demo can be run using containers. This is the easiest way to get started as it will spin up all the necessary
services. Moreover, the source code is mapped in the container so everytime a change occurs, there's no need to restart
the container(s).

The app will be available at [http://localhost:5173][demo-homepage] and Grafana will start at
[http://localhost:3000/][demo-grafana-homepage].

To start everything up, simply run:

```shell
docker compose --profile demo up -d
```

This will automatically install dependencies, build the demo and start it in `development` mode.

## Instrumentation

There is various data that is captured in this app. Some data is captured manually while other data is automatically
captured by the instrumentation provided by either Faro and/or OpenTelemetry.

You can have a look over the following pages to understand what and how data is collected.

- [Errors][docs-errors]
- [Events][docs-events]
- [Logs][docs-logs]
- [Measurements][docs-measurements]
- [Metas][docs-metas]
- [Traces][docs-traces]

## User Journey

The next section will present the steps that a user usually does when navigating through the app and what useful data is
collected from those actions. In some cases the mechanism behind it is also explained. To find out how to visualize the
data, you can refer the one of the docs from the **Presentation** chapter.

All the actions will be performed assuming that the demo is freshly ran and the database is empty.

1. Navigate to the [Homepage][demo-homepage]
   - [Web Vitals][web-vitals] are captured. They can be observed in the
     [Frontend dashboard in Grafana][demo-grafana-frontend-dashboard]
   - Traces for the document load are created. They can be found in the
     [Explore page in Grafana][demo-grafana-explore] using the `Trace ID` property at the top of the page
   - An error is registered because the endpoint that returns the state of the user returns `401` status code
   - The `Session ID` at the top can be used to filter out the data collected during the current user journey
   - [<img src="docs/assets/userJourney/homepage.png" alt="Homepage" height="100" />][assets-journey-homepage]
     [<img src="docs/assets/userJourney/homepageTraces.png" alt="Homepage traces" height="100" />][assets-journey-homepage-traces]
     [<img src="docs/assets/userJourney/homepageWebVitals.png" alt="Homepage Web Vitals" height="100" />][assets-journey-homepage-web-vitals]
1. Navigate to the [Seed page][demo-seed-page]
   - `route_change` event is registered with the new URL and the React route associated to that specific URL
   - [<img src="docs/assets/userJourney/seed.png" alt="Seed page" height="100" />][assets-seed]
     [<img src="docs/assets/userJourney/seedEvents.png" alt="Seed page" height="100" />][assets-seed-events]
1. Click on the `Seed` button to add some default data in the database
   - The following events are registered:
     - `seed`
     - `Sending Request` - created with every fetch request
     - `Request Completed` - created with every successful fetch request
   - The following spans are created:
     - The button click
     - A manual span which is associated with the `seed` event
     - The HTTP request to the API
     - The database calls
   - The `Trace ID` that appears under the button can be used to see the traces mentioned above
   - [<img src="docs/assets/userJourney/seedSuccess.png" alt="Seed page with successful run" height="100" />][assets-seed-success]
     [<img src="docs/assets/userJourney/seedSuccessEvents.png" alt="Events for Seed page with successfull run" height="100" />][assets-seed-success-events]<!-- markdownlint-disable-line MD013 -->
     [<img src="docs/assets/userJourney/seedSuccessTraces.png" alt="Traces for Seed page with successfull run" height="100" />][assets-seed-success-traces]<!-- markdownlint-disable-line MD013 -->
1. Click on the `Seed` button again to generate an error:
   - The following events are registered:
     - `seed`
     - `Sending Request` - created with every fetch request
     - `Request Failed` - created with every failed fetch request
   - The traces are different from the step above because the DB threw an exception
   - The `Trace ID` that appears under the button can be used to see the traces mentioned above
   - [<img src="docs/assets/userJourney/seedError.png" alt="Seed page with error run" height="100" />][assets-seed-error]
     [<img src="docs/assets/userJourney/seedErrorEvents.png" alt="Events for Seed page with error run" height="100" />][assets-seed-error-events]
     [<img src="docs/assets/userJourney/seedErrorTraces.png" alt="Traces for Seed page with error run" height="100" />][assets-seed-error-traces]
1. Navigate to the [Register page][demo-register-page]
   - `route_change` event is registered with the new URL and the React route associated to that specific URL
1. Enter `john.doe@grafana.com` as email and the fill in the rest of the fields then click on the `Register` button
   - The following events are registered:
     - `registerAttempt`
     - `registerFailed`
   - Traces are collected as well
   - [<img src="docs/assets/userJourney/registerError.png" alt="Register page with error" height="100" />][assets-register-error]
     [<img src="docs/assets/userJourney/registerErrorEvents.png" alt="Events for Register page with error" height="100" />][assets-register-error-events]
     [<img src="docs/assets/userJourney/registerErrorTraces.png" alt="Traces for Register page with error" height="100" />][assets-register-error-traces]
1. Navigate to the [Login page][demo-login-page]
   - `route_change` event is registered with the new URL and the React route associated to that specific URL
1. Login with the following credentials: `john.doe@grafana.com` as email and `test` as password
   - `route_change` event is registered with the new URL and the React route associated to that specific URL
   - The following events are registered:
     - `loginAttempt`
     - `loginSuccess` - The `registerAttempt` -> `registerFailed` -> `loginAttempt` -> `loginSuccess` sequence allows us
       to understand that a user tried to create an account, already having one
   - Traces are collected as well
   - All the data captured from this point until logout will be associated with the `John Doe` user. Associating the
     `John Doe` user and `session ID` will allow us to see what actions the user performed prior logging in.
1. Click on the `First Article`
   - `route_change` event is registered with the new URL and the React route associated to that specific URL
     - what's different from the other `route_change` events is that the route for this event is not identical to the URL
       but what React received as an input (`/articles/view/:id`)
1. Input some text in the `Add Comment` section and click `Create Comment`
   - The following events are registered:
     - `createArticleCommentAttempt`
     - `createArticleCommentSuccessfully`
1. Click on the `Logout` button in the header

[mimir]: https://grafana.com/oss/mimir
[demo-grafana-explore]: http://localhost:3000/explore
[demo-grafana-frontend-dashboard]: http://localhost:3000/dashboards?query=Frontend
[demo-grafana-homepage]: http://localhost:3000/
[demo-homepage]: http://localhost:5173/
[demo-login-page]: http://localhost:5173/auth/login
[demo-register-page]: http://localhost:5173/auth/register
[demo-seed-page]: http://localhost:5173/seed
[dotenv]: https://github.com/motdotla/dotenv
[express]: https://expressjs.com/
[faro-web-sdk]: https://github.com/grafana/faro-web-sdk
[grafana]: https://grafana.com/oss/grafana/
[loki]: https://grafana.com/oss/loki/
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[opentelemetry-js-express]: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
[opentelemetry-js-http]: https://www.npmjs.com/package/@opentelemetry/instrumentation-http
[opentelemetry-js-postgresql]: https://www.npmjs.com/package/@opentelemetry/instrumentation-pg
[opentelemetry-js-winston]: https://www.npmjs.com/package/@opentelemetry/instrumentation-winston
[postgresql]: https://www.postgresql.org/
[prom-client]: https://github.com/siimon/prom-client
[react]: https://reactjs.org/
[react-bootstrap]: https://react-bootstrap.github.io/
[react-hook-form]: https://react-hook-form.com/
[react-router]: https://reactrouter.com/en/main
[redux]: https://redux.js.org/
[redux-toolkit]: https://redux-toolkit.js.org/
[redux-toolkit-query]: https://redux-toolkit.js.org/rtk-query/overview
[sequelize]: https://sequelize.org/
[ssr]: https://reactjs.org/docs/react-dom-server.html
[tempo]: https://grafana.com/oss/tempo/
[vite]: https://vitejs.dev/
[web-vitals]: https://web.dev/vitals/
[winston]: https://github.com/winstonjs/winston
[docs-errors]: ./docs/instrumentations/errors.md
[docs-events]: ./docs/instrumentations/events.md
[docs-logs]: ./docs/instrumentations/logs.md
[docs-measurements]: ./docs/instrumentations/measurements.md
[docs-metas]: ./docs/instrumentations/metas.md
[docs-traces]: ./docs/instrumentations/traces.md
[assets-journey-homepage]: ./docs/assets/userJourney/homepage.png
[assets-journey-homepage-traces]: ./docs/assets/userJourney/homepageTraces.png
[assets-journey-homepage-web-vitals]: ./docs/assets/userJourney/homepageWebVitals.png
[assets-register-error]: ./docs/assets/userJourney/registerError.png
[assets-register-error-events]: ./docs/assets/userJourney/registerErrorEvents.png
[assets-register-error-traces]: ./docs/assets/userJourney/registerErrorTraces.png
[assets-seed]: ./docs/assets/userJourney/seed.png
[assets-seed-error]: ./docs/assets/userJourney/seedError.png
[assets-seed-error-events]: ./docs/assets/userJourney/seedErrorEvents.png
[assets-seed-error-traces]: ./docs/assets/userJourney/seedErrorTraces.png
[assets-seed-events]: ./docs/assets/userJourney/seedEvents.png
[assets-seed-success]: ./docs/assets/userJourney/seedSuccess.png
[assets-seed-success-events]: ./docs/assets/userJourney/seedSuccessEvents.png
[assets-seed-success-traces]: ./docs/assets/userJourney/seedSuccessTraces.png
